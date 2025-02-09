const express = require('express');
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('./database');

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     summary: Get system settings
 *     description: Retrieves the system settings as JSON.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    settings:
 *                        type: string
 *                        description: Json object with system settings.
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
 *                message: 'Failed to fetch system settings'
 */
router.get('/admin/settings', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
       const [settings] = await pool.query('SELECT settings FROM system_settings')
      //TODO -  Implement logic to retrieve system settings.
      res.status(200).json({ settings: settings[0].settings || '{}' });
    } catch (error) {
         console.error('Error fetching system settings:', error);
         res.status(500).json({ message: 'Failed to fetch system settings' });
    }
});

/**
 * @swagger
 * /admin/settings:
 *   post:
 *     summary: Update system settings
 *     description: Updates the system settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: string
 *                 description: The system settings to be updated as a json string.
 *             example:
 *               settings: '{"email_notifications": true, "default_language": "en"}'
 *     responses:
 *       200:
 *         description: System settings updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *               message: 'Settings updated successfully'
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
 *                message: 'Failed to update system settings.'
 */
router.post('/admin/settings', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const { settings } = req.body;
      try {
           //TODO -  Implement logic to update the system settings in the database
           await pool.query('INSERT INTO system_settings (settings) VALUES (?) ON DUPLICATE KEY UPDATE settings = ?', [settings, settings]);
          res.status(200).json({ message: 'Settings updated successfully' });
      } catch (error) {
        console.error('Error updating system settings:', error);
       res.status(500).json({ message: 'Failed to update system settings.' });
      }
});
/**
 * @swagger
 * /admin/database:
 *   post:
 *     summary: Configures database connections
 *     description: Configure database connections.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *        required: true
 *        content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
  *                 database_host:
 *                      type: string
 *                      description: The database host url.
 *                database_user:
 *                      type: string
 *                      description: username for the database connection.
 *                database_password:
 *                      type: string
 *                      description: password for database connection
 *                database_name:
 *                     type: string
 *                     description: name of the database
 *                database_port:
 *                     type: string
 *                     description: port to connect to database
 *             example:
 *                database_host: "localhost:5432"
 *                database_user: "postgres"
 *                database_password: "password123"
 *                database_name: "reviewhubdb"
 *                database_port: "3306"
 *     responses:
 *       200:
 *         description: Database configurations saved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Database configurations updated successfully.'
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
 *                message: 'Failed to update database configurations.'
 */
router.post('/admin/database', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {database_host, database_user, database_password, database_name, database_port } = req.body
    try {
         //TODO - Implement logic to configure database connections
        console.log("setting database configuration", req.body);
         res.status(200).json({ message: 'Database configurations updated successfully.' });
    } catch (error) {
        console.error('Error configuring database connections:', error);
        res.status(500).json({ message: 'Failed to update database configurations.' });
    }
});
/**
 * @swagger
 * /admin/integration:
 *   post:
 *     summary: Configure integration settings
 *     description: Configures integration settings for different services.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               integration_type:
 *                 type: string
 *                 description: Type of service to integrate with. (e.g., google, microsoft, other).
 *               integration_settings:
 *                 type: string
 *                 description: Settings for a specific integration as a json object.
 *             example:
 *                integration_type: "google_docs"
 *                integration_settings: "{'clientId':'xyz', 'clientSecret':'abc'}"
 *     responses:
 *       200:
 *         description: Integration settings updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *               message: 'Integration settings saved successfully'
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
 *                message: 'Failed to update integration settings.'
 */
router.post('/admin/integration', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const { integration_type, integration_settings } = req.body;
    try {
       //TODO - Implement logic to configure integration settings
        console.log("setting configuration settings for integration type:", integration_type);
        res.status(200).json({ message: 'Integration settings saved successfully' });
    } catch (error) {
       console.error('Error updating integration settings:', error);
        res.status(500).json({ message: 'Failed to update integration settings.' });
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