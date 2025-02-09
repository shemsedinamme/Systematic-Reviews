// adminUserRoutes.js
const express = require('express');
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const { v4: uuidv4 } = require('uuid');
const pool = require('./database');
const Role = require('../models/role.model');
const router = express.Router();

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: List all roles
 *     description: Returns the list of available roles, accessible only to admin users.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                     role_id:
 *                       type: string
 *                       description: Unique identifier for the role
 *                     role_name:
 *                       type: string
 *                       description: The name of the role.
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to retrieve the roles.'
 */
router.get('/admin/roles', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const roles = await pool.getAllRecord('roles', Role);
        res.status(200).json(roles.map(role => role.toJSON()));
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to retrieve the roles.' });
    }
});

/**
 * @swagger
 * /admin/roles:
 *   post:
 *     summary: Create a new role
 *     description: Create a new role for the user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *        required: true
 *        content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role_name:
 *                   type: string
 *                   description: The name of the new role.
 *             example:
 *                  role_name: "data_extractor"
 *     responses:
 *       201:
 *         description: Role created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
  *                 role_id:
 *                   type: string
 *                   description: The unique identifier of the created role.
 *                 role_name:
 *                   type: string
 *                   description: The name of the newly created role.
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Role name is required'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Failed to create a new role.'
 */
router.post('/admin/roles', authenticateToken, authorizeRole('admin'), async (req, res) => {
     const {role_name} = req.body;
    if (!role_name) return res.status(400).json({ message: 'Role name is required' });
   try {
     const newRole = new Role({
          role_id: uuidv4(),
           role_name: role_name
       });
    const result = await pool.insertRecord('roles', newRole, ['role_id', 'role_name']);
        if (!result) {
           throw new Error('Failed to create a new role.');
       }
     res.status(201).json(new Role(newRole).toJSON());
    } catch (error) {
        console.error('Error creating new role:', error);
       res.status(500).json({ message: 'Failed to create a new role.' });
   }
});
/**
 * @swagger
 * /admin/roles/{role_id}:
 *   put:
 *     summary: Update a specific role using the role id.
 *     description: Update a specific role by its id, only admin role is allowed for this operation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         description: ID of the role to update.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role_name:
 *                  type: string
 *                  description: The new name for the role.
 *             example:
 *                  role_name: "admin_new"
 *     responses:
 *       200:
 *         description: Role updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    role_id:
 *                      type: string
 *                      description: The unique identifier of the role.
 *                   role_name:
 *                     type: string
 *                     description: The name of the updated role.
 *       404:
 *          description: Role not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Role not found.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to update the role.'
 */
router.put('/admin/roles/:role_id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const { role_id } = req.params;
    const { role_name } = req.body;
    if (!role_name) return res.status(400).json({ message: 'Role name is required' });
    try {
       const updateData = {
          role_name: role_name
        }
     const updatedRole =  await pool.updateRecord('roles', updateData, role_id, 'role_id', ['role_name']);
        if (!updatedRole)  return res.status(404).json({ message: 'Role not found.' });
       const role = await pool.getRecordById('roles', role_id, 'role_id', Role)
        res.status(200).json(role.toJSON());
    } catch (error) {
        console.error('Error updating role:', error);
      res.status(500).json({ message: 'Failed to update the role.' });
    }
});
/**
 * @swagger
 * /admin/roles/{role_id}:
 *   delete:
 *     summary: Delete a specific role
 *     description: Delete a specific role using role ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         description: ID of the role to be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                     type: string
 *                     description: Message from system about deletion.
 *       404:
 *          description: Role not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Role not found.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to delete the role.'
 */
router.delete('/admin/roles/:role_id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const { role_id } = req.params;
    try {
        const deletedRole = await pool.deleteRecord('roles', role_id, 'role_id');
        if (!deletedRole) return res.status(404).json({ message: 'Role not found.' });
        res.status(200).json({ message: 'Role deleted successfully.' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ message: 'Failed to delete the role.' });
    }
});
router.use((req, res, next) => {
    // Log all changes to the audit trail.
    const logDetails = {
        user_id: req.user ? req.user.user_id : null,
        action: `${req.method} ${req.path}`,
        target_type: 'api',
        target_id: null,
        details: JSON.stringify(req.body || req.query)
    };
    pool.query('INSERT INTO audit_logs(log_id, user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)', [uuidv4(), logDetails.user_id, logDetails.action, logDetails.target_type, logDetails.target_id, logDetails.details])
    next();
});

module.exports = router;