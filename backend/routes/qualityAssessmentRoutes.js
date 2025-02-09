const express = require('express');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../authMiddleware');
const { sanitizeInput } = require('../utils');
const { body, validationResult, query, param } = require('express-validator');

const router = express.Router();

// Database table names
const RISK_OF_BIAS_TOOLS_TABLE = 'quality_assessment_criteria';


// Centralized error handling function
const handleAPIError = (res, error, statusCode = 500, message = 'Internal server error') => {
    console.error(error);
    res.status(statusCode).json({ message: message });
};

// Database query helper function
const executeQuery = async (query, params) => {
    try {
        const [results] = await pool.query(query, params);
        return results;
    } catch (error) {
        throw error;
    }
};

// -----------------------------------------------------------------------------
// Prompt 7.1: Risk of Bias Assessment (Backend) - tools
// -----------------------------------------------------------------------------

/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools:
 *   get:
 *     summary: Get a list of risk of bias assessment tools.
 *     description: Fetches a list of available risk of bias assessment tools.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk of bias assessment tools fetched successfully.
 *         content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    tool_id:
 *                     type: string
 *                    tool_name:
 *                       type: string
 *                     tool_description:
 *                      type: string
 *                     tool_type:
 *                      type: string
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
 *               message: 'Failed to fetch risk of bias assessment tools.'
 */
router.get('/quality-assessment/risk-of-bias/tools', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    async (req, res) => {
        try {
           const toolsQuery = `SELECT criterion_id as tool_id, criterion_name as tool_name, criterion_description as tool_description, criterion_type as tool_type
                              FROM quality_assessment_criteria
                               WHERE criterion_type = 'bias' or criterion_type = 'quality'`;

            const tools = await executeQuery(toolsQuery);
            res.status(200).json(tools);
        } catch (error) {
            handleAPIError(res, error, 500, 'Failed to fetch risk of bias assessment tools.');
        }
    }
);
/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools:
 *   post:
 *     summary: Create a new risk of bias assessment tool.
 *     description: Create a new risk of bias assessment tool.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tool_name:
 *                 type: string
 *                 description: The name of the tool.
 *               tool_description:
 *                 type: string
 *                  description: The description of the tool.
  *               tool_type:
 *                  type: string
 *                   enum: [bias, quality]
 *                 description: the type of the tool.
 *     responses:
 *       201:
 *         description: New tool created successfully.
 *         content:
 *          application/json:
 *            schema:
 *             type: object
 *             properties:
 *                tool_id:
 *                 type: string
 *                 description: The unique identifier of the tool
 *                tool_name:
 *                  type: string
 *                 description: The name of the tool.
 *                tool_description:
 *                   type: string
 *                    description: The description of the tool.
  *                tool_type:
 *                   type: string
 *                 description: The type of the tool (bias, quality).
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
 *               message: 'Tool name and description is required.'
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
 *                message: 'Failed to create a new risk of bias assessment tool.'
 */
router.post('/quality-assessment/risk-of-bias/tools', authenticateToken, authorizeRole(['admin']),
    [
      body('tool_name').notEmpty().isString().trim().isLength({max:255}).withMessage('Tool name is required, and must be a string not more than 255 characters.'),
        body('tool_description').notEmpty().isString().trim().isLength({max:1000}).withMessage('Tool description is required, and must be a string not more than 1000 characters.'),
        body('tool_type').notEmpty().isIn(['bias','quality']).withMessage('Tool type is required and must be bias or quality')
    ],
     async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { tool_name, tool_description, tool_type } = req.body;
        try {
            const toolId = uuidv4();
            const insertToolQuery = `
              INSERT INTO quality_assessment_criteria (criterion_id, criterion_name, criterion_description, criterion_type)
               VALUES (?, ?, ?, ?)
           `;
            await executeQuery(insertToolQuery, [toolId, sanitizeInput(tool_name), sanitizeInput(tool_description), sanitizeInput(tool_type)]);

            res.status(201).json({ tool_id: toolId, tool_name: tool_name, tool_description: tool_description, tool_type: tool_type });
        }
        catch (error) {
            handleAPIError(res, error, 500, 'Failed to create a new risk of bias assessment tool.');
        }
    }
);
/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools/{tool_id}:
 *   get:
 *     summary: Get a specific risk of bias assessment tool.
 *     description: Fetches details of a specific risk of bias assessment tool by using its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tool_id
 *         required: true
 *         description: ID of the tool to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tool fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tool_id:
 *                   type: string
 *                   description: The unique identifier of the tool.
 *                 tool_name:
 *                    type: string
 *                   description: The name of the tool.
 *                 tool_description:
 *                    type: string
 *                   description: The description of the tool.
 *                  tool_type:
  *                   type: string
 *                   description: the type of the tool.
 *       404:
 *         description: Tool not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Tool not found.'
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
 *                message: 'Failed to fetch risk of bias assessment tool.'
 */
router.get('/quality-assessment/risk-of-bias/tools/:tool_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    [
        param('tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format')
    ],
    async (req, res) => {
      const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
      const {tool_id} = req.params;
        try {
              const toolQuery =  `SELECT criterion_id as tool_id, criterion_name as tool_name, criterion_description as tool_description, criterion_type as tool_type
                              FROM quality_assessment_criteria WHERE criterion_id = ?`;
            const [tool] = await executeQuery(toolQuery,[tool_id]);

           if (!tool || tool.length === 0) {
               return handleAPIError(res, null, 404, `Tool with id ${tool_id} not found.`);
           }
            res.status(200).json(tool[0]);
       } catch (error) {
            handleAPIError(res, error, 500, 'Failed to fetch risk of bias assessment tool.');
        }
});

/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools/{tool_id}:
 *   put:
 *     summary: Updates a specific risk of bias assessment tool.
 *     description: Updates a specific risk of bias assessment tool by using its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tool_id
 *         required: true
 *         description: ID of the tool to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tool_name:
 *                 type: string
 *                 description: The name of the tool.
 *               tool_description:
 *                 type: string
 *                 description: The description of the tool.
  *               tool_type:
 *                  type: string
 *                   enum: [bias, quality]
 *                 description: The type of the tool (bias, quality).
 *     responses:
 *       200:
 *         description: Tool updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  tool_id:
 *                    type: string
 *                    description: The unique id of the tool.
 *                  tool_name:
 *                    type: string
 *                   description: The name of the tool.
 *                  tool_description:
 *                      type: string
 *                   description: The description of the tool.
 *                  tool_type:
 *                     type: string
 *                   description: the type of the tool.
 *       404:
 *         description: Tool not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Tool not found.'
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
 *               message: 'Failed to update risk of bias assessment tool.'
 */
router.put('/quality-assessment/risk-of-bias/tools/:tool_id', authenticateToken, authorizeRole(['admin']),
     [
       param('tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format'),
       body('tool_name').optional().isString().trim().isLength({max:255}).withMessage('Tool name must be a string not more than 255 characters.'),
       body('tool_description').optional().isString().trim().isLength({max:1000}).withMessage('Tool description must be a string not more than 1000 characters.'),
        body('tool_type').optional().isIn(['bias', 'quality']).withMessage('Tool type must be bias or quality')
    ],
     async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
      const { tool_id } = req.params;
      const { tool_name, tool_description, tool_type } = req.body;
        try {
             const toolExists = await executeQuery(`SELECT criterion_id FROM quality_assessment_criteria WHERE criterion_id = ?`, [tool_id]);
            if(toolExists.length === 0) return handleAPIError(res, null, 404, `Tool with id ${tool_id} not found.`);
           let updateQuery
         updateQuery = `UPDATE quality_assessment_criteria SET criterion_name = ?, criterion_description = ?, criterion_type = ? WHERE criterion_id = ?`;
       await executeQuery(updateQuery,[sanitizeInput(tool_name), sanitizeInput(tool_description) , sanitizeInput(tool_type) , tool_id])
            res.status(200).json({tool_id: tool_id,  tool_name: tool_name, tool_description:tool_description, tool_type:tool_type});
        }
       catch(error){
          handleAPIError(res, error, 500, 'Failed to update risk of bias assessment tool.');
      }
});
/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools/{tool_id}:
 *   delete:
 *     summary: Delete a specific risk of bias assessment tool.
 *     description: Deletes a specific risk of bias assessment tool by using its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tool_id
 *         required: true
 *         description: ID of the tool to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tool deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *       404:
 *         description: Tool not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Tool not found.'
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
 *                message: 'Failed to delete risk of bias assessment tool.'
 */
router.delete('/quality-assessment/risk-of-bias/tools/:tool_id', authenticateToken, authorizeRole(['admin']),
    [
         param('tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format'),
    ],
     async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const {tool_id} = req.params;
    try{
           const toolExists = await executeQuery(`SELECT criterion_id FROM quality_assessment_criteria WHERE criterion_id = ?`, [tool_id]);
            if(toolExists.length === 0) return handleAPIError(res, null, 404, `Tool with id ${tool_id} not found.`);
        const deleteQuery = `DELETE FROM quality_assessment_criteria WHERE criterion_id = ?`;
        await executeQuery(deleteQuery, [tool_id])
       res.status(200).json({message: `Tool with id ${tool_id} deleted successfully.`});
    }catch(error){
       handleAPIError(res, error, 500, 'Failed to delete risk of bias assessment tool.');
    }
});

/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools/{tool_id}/criteria:
 *   get:
 *     summary: Get the criteria for a specific risk of bias assessment tool.
 *     description: Fetches criteria for a given risk of bias assessment tool using tool ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tool_id
 *         required: true
 *         description: ID of the tool to retrieve criteria for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Criteria fetched successfully.
 *         content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                      criteria_id:
 *                        type: string
 *                      criteria_text:
 *                        type: string
  *                     criteria_type:
 *                       type: string
 *                     criteria_options:
 *                        type: string
 *       404:
 *         description: Tool not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Tool not found.'
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
 *               message: 'Failed to fetch criteria for the selected tool.'
 */
router.get('/quality-assessment/risk-of-bias/tools/:tool_id/criteria', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    [
         param('tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const {tool_id} = req.params;
        try {
             const toolExists = await executeQuery(`SELECT criterion_id FROM quality_assessment_criteria WHERE criterion_id = ?`, [tool_id]);
            if(toolExists.length === 0) return handleAPIError(res, null, 404, `Tool with id ${tool_id} not found.`);

            const criteriaQuery = `
             SELECT criterion_id, criterion_name as criteria_text, criterion_type, criteria_options FROM quality_assessment_criteria
            WHERE project_id = ? AND criterion_id = ? AND (criterion_type = 'bias' or criterion_type = 'quality')
            `;
           const criteria = await executeQuery(criteriaQuery, [tool_id, tool_id]);
           res.status(200).json(criteria);
        } catch (error) {
            handleAPIError(res, error, 500, 'Failed to fetch criteria for the selected tool.');
        }
    }
);

/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools/{tool_id}/criteria:
 *   post:
 *     summary: Create new criteria for a specific risk of bias assessment tool.
 *     description: Creates new criteria for a given risk of bias assessment tool.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tool_id
 *         required: true
 *         description: The id of the tool to create criteria for.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria_text:
 *                 type: string
 *                 description: The criteria text.
  *               criteria_type:
 *                 type: string
 *                   enum: [bias, quality]
 *                 description: The type of the criteria
 *              criteria_options:
 *                 type: string
 *                 description: Options for this criteria.
 *     responses:
 *       201:
 *         description: Criteria created successfully.
 *         content:
 *          application/json:
 *            schema:
 *             type: object
 *             properties:
 *                criteria_id:
 *                   type: string
 *                   description: The id of the created criteria
 *                criteria_text:
 *                   type: string
 *                   description: The text for the created criteria.
  *                criteria_type:
   *                   type: string
  *                 description: The type of the criteria.
  *               criteria_options:
  *                   type: string
  *                   description: Options for the created criteria.
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
 *               message: 'Criteria text and type are required for the creation.'
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
 *                message: 'Failed to create criteria for the selected tool.'
 */
router.post('/quality-assessment/risk-of-bias/tools/:tool_id/criteria', authenticateToken, authorizeRole(['admin']),
     [
        param('tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format'),
        body('criteria_text').notEmpty().isString().trim().isLength({max:2000}).withMessage('Criteria text is required and must be a string with max 2000 characters'),
          body('criteria_type').notEmpty().isIn(['bias', 'quality']).withMessage('criteria type is required and must be either bias or quality'),
        body('criteria_options').optional().isString().trim().isLength({max:2000}).withMessage('criteria_options must be a string with max 2000 characters')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { tool_id } = req.params;
        const { criteria_text, criteria_type, criteria_options } = req.body;
      try {
           const toolExists = await executeQuery(`SELECT criterion_id FROM quality_assessment_criteria WHERE criterion_id = ?`, [tool_id]);
            if(toolExists.length === 0) return handleAPIError(res, null, 404, `Tool with id ${tool_id} not found.`);
          const criterionId = uuidv4()
        const insertQuery =  `INSERT INTO quality_assessment_criteria (criterion_id, criterion_name, criterion_type, criteria_options, project_id) VALUES (?, ?, ?, ?, ?)`;
           await executeQuery(insertQuery,[criterionId, sanitizeInput(criteria_text), sanitizeInput(criteria_type), sanitizeInput(criteria_options), tool_id])
            res.status(201).json({
             criteria_id: criterionId,
              criteria_text: criteria_text,
              criteria_type: criteria_type,
            criteria_options: criteria_options
            });
       } catch (error) {
            handleAPIError(res, error, 500, 'Failed to create criteria for the selected tool.');
        }
});
/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools/{tool_id}/criteria/{criteria_id}:
 *   put:
 *     summary: Update existing criteria for a specific risk of bias assessment tool.
 *     description: Updates existing criteria for a specific risk of bias assessment tool by using tool and criteria id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tool_id
 *         required: true
 *         description: ID of the tool that contains the criteria
 *         schema:
 *           type: string
 *       - in: path
 *         name: criteria_id
 *         required: true
 *         description: ID of the criteria to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria_text:
 *                 type: string
 *                 description: The updated text of the criteria.
  *               criteria_options:
 *                 type: string
 *                 description: The updated options for the criteria
 *     responses:
 *       200:
 *         description: Criteria updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  criteria_id:
 *                   type: string
 *                   description: the id of the updated criteria
 *                 criteria_text:
 *                   type: string
 *                   description: The updated text of the criteria.
 *                criteria_options:
 *                   type: string
 *                   description: The updated options for the criteria.
 *       404:
 *         description: Criteria or tool not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Criteria not found.'
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
 *               message: 'Failed to update criteria.'
 */
router.put('/quality-assessment/risk-of-bias/tools/:tool_id/criteria/:criteria_id', authenticateToken, authorizeRole(['admin']),
     [
        param('tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format'),
          param('criteria_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid criteria id format'),
          body('criteria_text').optional().isString().trim().isLength({max:2000}).withMessage('Criteria must be a string with max 2000 characters.'),
        body('criteria_options').optional().isString().trim().isLength({max:2000}).withMessage('criteria options must be a string with max 2000 characters.')
     ],
    async (req, res) => {
       const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { tool_id, criteria_id } = req.params;
      const { criteria_text, criteria_options } = req.body;
     try{
         let criteriaExists;
           criteriaExists = await executeQuery(`SELECT criterion_id FROM quality_assessment_criteria WHERE criterion_id = ? AND project_id = ?`, [criteria_id, tool_id]);
             if(criteriaExists.length === 0) return handleAPIError(res, null, 404, `Criteria with id ${criteria_id} not found for the tool ${tool_id}.`);

          const updateCriteriaQuery = `
              UPDATE quality_assessment_criteria
                 SET criterion_name = ?, criteria_options = ?
                 WHERE criterion_id = ?
            `;
            await executeQuery(updateCriteriaQuery, [sanitizeInput(criteria_text), sanitizeInput(criteria_options), criteria_id]);

           res.status(200).json({ criteria_id: criteria_id, criteria_text: criteria_text, criteria_options: criteria_options});
        }
      catch (error){
          handleAPIError(res, error, 500, 'Failed to update criteria.');
        }
});
/**
 * @swagger
 * /quality-assessment/risk-of-bias/tools/{tool_id}/criteria/{criteria_id}:
 *   delete:
 *     summary: Delete a specific criteria from a risk of bias assessment tool.
 *     description: Deletes a specific criterion for a given risk of bias assessment tool.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tool_id
 *         required: true
 *         description: ID of the tool which contains the criteria
 *         schema:
 *           type: string
 *       - in: path
 *         name: criteria_id
 *         required: true
 *         description: ID of the criteria to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Criteria deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *       404:
 *         description: Criteria or tool not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Criteria not found.'
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
 *               message: 'Failed to delete criteria.'
 */
router.delete('/quality-assessment/risk-of-bias/tools/:tool_id/criteria/:criteria_id', authenticateToken, authorizeRole(['admin']),
    [
        param('tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format'),
         param('criteria_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid criteria id format'),
    ],
    async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { tool_id, criteria_id } = req.params;
    try {
        const criteriaExists = await executeQuery(`SELECT criterion_id FROM quality_assessment_criteria WHERE criterion_id = ? AND project_id = ?`, [criteria_id, tool_id]);
            if(criteriaExists.length === 0) return handleAPIError(res, null, 404, `Criteria with id ${criteria_id} not found for the tool ${tool_id}.`);
       const deleteQuery = `DELETE FROM quality_assessment_criteria WHERE criterion_id = ?`;
       await executeQuery(deleteQuery, [criteria_id]);
        res.status(200).json({message: `Criteria with id ${criteria_id} deleted successfully.`});
      }
      catch(error) {
         handleAPIError(res, error, 500, 'Failed to delete criteria.');
      }
});
/**
 * @swagger
 * /quality-assessment/risk-of-bias/assessments:
 *   get:
 *     summary: Get all quality assessments for a specific study.
 *     description: Fetches all quality assessment ratings of the given study.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: study_id
 *         required: true
 *         description: The id of the study to fetch assessments for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quality assessments fetched successfully.
 *         content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                     assessment_id:
 *                         type: string
 *                         description: unique id of the assessment.
 *                    study_id:
 *                        type: string
 *                        description: study id
 *                    tool_id:
 *                      type: string
 *                       description: risk of bias tool id
 *                     reviewer_id:
 *                        type: string
 *                        description: reviewer of the assessment
  *                     criteria_id:
 *                         type: string
 *                         description: criteria id for assessment.
 *                     rating:
 *                         type: string
 *                        description: rating for the criteria.
 *                    comment:
 *                       type: string
 *                        description: any comment for the rating.
 *                   assessment_date:
 *                       type: string
 *                        description: time of assessment.
 *       404:
 *         description: Assessments not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'No assessment found for this study.'
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
 *                message: 'Failed to fetch quality assessments.'
 */
router.get('/quality-assessment/risk-of-bias/assessments', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    [
         query('study_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid study id format'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
         if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
         }
        const { study_id } = req.query;
        try{
            const articleExists = await executeQuery(`SELECT article_id FROM articles WHERE article_id = ?`, [study_id]);
            if(articleExists.length === 0) return handleAPIError(res, null, 404, `Article with id ${study_id} not found.`);
          const assessmentQuery = `SELECT rating_id as assessment_id, article_id as study_id, user_id as reviewer_id, criterion_id, rating, rationale as comment, rating_date as assessment_date, tool_id
            FROM quality_assessment_ratings
             WHERE article_id = ?
            `;
            const assessments = await executeQuery(assessmentQuery, [study_id]);
            res.status(200).json(assessments);
        } catch (error) {
          handleAPIError(res, error, 500, 'Failed to fetch quality assessments.');
      }
    });
/**
 * @swagger
 * /quality-assessment/risk-of-bias/assessments:
 *   post:
 *     summary: Create new quality assessments for a specific study.
 *     description: Create new quality assessment ratings for a specific study by using study id.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *              type: object
 *              properties:
 *                 study_id:
 *                  type: string
 *                  description: id of study.
 *                 tool_id:
 *                    type: string
 *                   description: id of tool being used.
 *                 criteria_id:
 *                     type: string
 *                   description: id of the criteria used for rating.
 *                 rating:
 *                    type: string
 *                    description: rating given for the criteria
 *                 comment:
 *                     type: string
 *                      description: comment given for the rating
 *     responses:
 *       201:
 *         description: Quality assessment ratings created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                       type: string
 *                       description: The message returned by the system.
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
 *                message: 'study id, tool id and ratings required for each assessment.'
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
 *                message: 'Failed to save quality assessment ratings.'
 */
router.post('/quality-assessment/risk-of-bias/assessments', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
     [
        body().isArray().notEmpty().withMessage('Assessments must be an array of object.'),
       body('*.study_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid study id format'),
      body('*.tool_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid tool id format'),
        body('*.criteria_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid criteria id format'),
        body('*.rating').optional().isString().trim(),
         body('*.comment').optional().isString().trim().isLength({max:1000}).withMessage('Comment must be a string and maximum 1000 characters.')
      ],
    async (req, res) => {
       const errors = validationResult(req);
         if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
       }
       const assessments = req.body;
       try{
              await Promise.all(assessments.map(async (assessment) => {
                   const { study_id, tool_id, criteria_id, rating, comment } = assessment;
                 const assessmentId = uuidv4();
               const insertAssessmentQuery = `
                    INSERT INTO quality_assessment_ratings (rating_id, article_id, criterion_id, user_id, rating, rationale, tool_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
              await executeQuery(insertAssessmentQuery, [assessmentId, study_id, criteria_id, req.user.user_id, rating, sanitizeInput(comment), tool_id])

           }));
            res.status(201).json({ message: 'Assessments created successfully'});

       }catch (error) {
            handleAPIError(res, error, 500, 'Failed to save quality assessment ratings.');
       }
});
/**
 * @swagger
 * /quality-assessment/risk-of-bias/assessments/{assessment_id}:
 *   get:
 *     summary: Get details of a specific quality assessment.
 *     description: Fetches quality assessment details by using its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessment_id
 *         required: true
 *         description: ID of the assessment to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  assessment_id:
 *                    type: string
 *                    description: id of assessment.
 *                  study_id:
 *                      type: string
 *                     description: id of study.
 *                  tool_id:
 *                     type: string
 *                     description: id of tool being used for assessment.
 *                   reviewer_id:
 *                       type: string
 *                       description: id of user performing the assessment.
 *                   criteria_id:
 *                       type: string
 *                       description: The id of the criteria used for assessment.
 *                   rating:
 *                      type: string
 *                       description: The rating given to a criteria.
  *                    comment:
 *                      type: string
 *                      description: The comment provided for a given criteria.
 *                  assessment_date:
  *                      type: string
  *                     description: Time when assessment was performed.
 *       404:
 *         description: Assessment not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Assessment not found.'
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
 *               message: 'Failed to fetch quality assessment.'
 */
router.get('/quality-assessment/risk-of-bias/assessments/:assessment_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
     [
         param('assessment_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid assessment id format'),
    ],
     async (req, res) => {
       const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { assessment_id } = req.params;
        try {
             const assessmentQuery = `
                SELECT rating_id as assessment_id, article_id as study_id, user_id as reviewer_id, criterion_id, rating, rationale as comment, rating_date as assessment_date, tool_id
                    FROM quality_assessment_ratings
                     WHERE rating_id = ?
                 `;
            const [assessment] = await executeQuery(assessmentQuery, [assessment_id]);
             if (!assessment || assessment.length === 0) {
                 return handleAPIError(res, null, 404, `Assessment with id ${assessment_id} not found.`);
           }
            res.status(200).json(assessment[0]);
        }
         catch(error){
           handleAPIError(res, error, 500, 'Failed to fetch quality assessment.');
        }
});
/**
 * @swagger
 * /quality-assessment/risk-of-bias/assessments/{assessment_id}:
 *   put:
 *     summary: Update a specific quality assessment.
 *     description: Updates a specific quality assessment rating by its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessment_id
 *         required: true
 *         description: ID of the assessment to update
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                  type: string
 *                  description: rating for the criteria.
 *               comment:
 *                   type: string
 *                  description: A comment for the rating.
 *     responses:
 *       200:
 *         description: Quality assessment updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                  assessment_id:
 *                     type: string
 *                    description: id of assessment.
 *                   study_id:
 *                       type: string
 *                      description: id of study.
 *                   tool_id:
 *                       type: string
 *                       description: id of tool being used for assessment.
 *                   reviewer_id:
 *                       type: string
 *                       description: id of user performing the assessment.
 *                   criteria_id:
 *                       type: string
 *                       description: The id of the criteria used for assessment.
 *                   rating:
 *                      type: string
 *                      description: The rating given to a criteria.
  *                    comment:
 *                      type: string
 *                      description: The comment provided for a given criteria.
 *                 assessment_date:
  *                      type: string
  *                     description: Time when assessment was performed.
 *       404:
 *         description: Assessment not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Assessment not found.'
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
 *                message: 'Failed to update quality assessment.'
 */
router.put('/quality-assessment/risk-of-bias/assessments/:assessment_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
     [
          param('assessment_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid assessment id format'),
        body('rating').optional().isString().trim(),
        body('comment').optional().isString().trim().isLength({max:1000}).withMessage('Comment must be a string with a maximum 1000 characters.')
    ],
    async (req, res) => {
       const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { assessment_id } = req.params;
      const { rating, comment } = req.body;
        try{
           const [assessment] = await executeQuery(`SELECT rating_id as assessment_id, article_id as study_id, user_id as reviewer_id, criterion_id, rating, rationale as comment, rating_date as assessment_date, tool_id
                    FROM quality_assessment_ratings
                     WHERE rating_id = ?`, [assessment_id]);
            if (!assessment || assessment.length === 0) return handleAPIError(res, null, 404, `Assessment with id ${assessment_id} not found.`);
            const updateAssessmentQuery = `
             UPDATE quality_assessment_ratings SET rating = ?, rationale = ? WHERE rating_id = ?
            `;
             await executeQuery(updateAssessmentQuery, [rating, sanitizeInput(comment) || null, assessment_id])
            const [updatedAssessment] =  await executeQuery(`SELECT rating_id as assessment_id, article_id as study_id, user_id as reviewer_id, criterion_id, rating, rationale as comment, rating_date as assessment_date, tool_id FROM quality_assessment_ratings WHERE rating_id = ?`, [assessment_id]);
           res.status(200).json(updatedAssessment[0]);
        }
        catch(error){
           handleAPIError(res, error, 500, 'Failed to update quality assessment.');
        }
});

 /**
 * @swagger
 * /quality-assessment/risk-of-bias/assessments/{assessment_id}:
 *   delete:
 *     summary: Delete a specific quality assessment.
 *     description: Deletes quality assessment ratings by using its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessment_id
 *         required: true
 *         description: ID of the assessment to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *       404:
 *         description: Assessment not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Assessment not found.'
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
 *                message: 'Failed to delete assessment.'
 */
router.delete('/quality-assessment/risk-of-bias/assessments/:assessment_id', authenticateToken, authorizeRole(['admin', 'lead_author']),
    [
         param('assessment_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid assessment id format'),
    ],
     async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { assessment_id } = req.params;
    try {
        const [assessmentExists] = await executeQuery(`SELECT rating_id FROM quality_assessment_ratings WHERE rating_id = ?`, [assessment_id]);
        if(!assessmentExists || assessmentExists.length === 0) return handleAPIError(res, null, 404, `Assessment with id ${assessment_id} not found.`);
        const deleteQuery = `DELETE FROM quality_assessment_ratings WHERE rating_id = ?`;
          await executeQuery(deleteQuery,[assessment_id]);
         res.status(200).json({message: `Assessment with id ${assessment_id} deleted successfully.`});
       }
      catch(error){
           handleAPIError(res, error, 500, 'Failed to delete assessment.');
        }
});
// -----------------------------------------------------------------------------


// End of Module 7 Implementation
// -----------------------------------------------------------------------------
module.exports = router;
