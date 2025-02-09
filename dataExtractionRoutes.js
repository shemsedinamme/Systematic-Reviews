const express = require('express');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const pool = require('./database');
const {  authorizeRole } = require('./authMiddleware');
const { sanitizeInput } = require('./utils');
const { body, validationResult, param, query } = require('express-validator');
const router = express.Router();

// Database table and column names
const EXTRACTION_FORMS_TABLE = 'extraction_forms';
const FORM_FIELDS_TABLE = 'form_fields';
const FORM_TEMPLATES_TABLE = 'form_templates';


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
// Prompt 6.1: Data Extraction Form Creation and Customization
// -----------------------------------------------------------------------------

/**
 * @swagger
 * /extraction-forms:
 *   get:
 *     summary: Retrieve all extraction forms for a project.
 *     description: Retrieves a list of all extraction forms for a specified project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Extraction forms fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   form_id:
 *                     type: string
 *                     description: The unique identifier for the extraction form.
 *                   form_name:
 *                     type: string
 *                     description: The name of the form.
 *                   form_description:
 *                     type: string
 *                     description: Description of the form.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Project id is required'
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
 *                message: 'Failed to fetch extraction forms.'
 */
router.get('/extraction-forms',
  [
        query('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const {project_id} = req.query;
    try {
           const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
         if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const query = `SELECT form_id, form_name, form_description FROM ${EXTRACTION_FORMS_TABLE} WHERE project_id = ?`;
        const forms =  await executeQuery(query, [project_id]);
        res.status(200).json(forms);
    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to fetch extraction forms.');
    }
});

/**
 * @swagger
 * /extraction-forms:
 *   post:
 *     summary: Creates a new data extraction form.
 *     description: Creates a new data extraction form for a specific project.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               form_name:
 *                 type: string
 *                 description: The name of the data extraction form.
 *               form_description:
 *                 type: string
 *                 description: The description for the data extraction form.
 *               fields:
 *                   type: array
 *                   description: array of fields for the data extraction form
 *                   items:
 *                         type: object
 *                         properties:
 *                              field_id:
 *                                  type: string
 *                                   description: id of the field
 *                              field_label:
 *                                type: string
 *                                  description: label of the field
  *                              field_type:
 *                                type: string
 *                                 description: type of the field
 *                              field_options:
 *                                type: string
 *                                 description: options of the field (comma separated)
 *                              conditional_logic:
 *                                 type: string
 *                                 description: conditional logic for the field
 *                              field_order:
  *                                 type: number
  *                                  description: order of the field
 *               template_id:
 *                  type: string
 *                  description: id of the template if the form is created using template
 *               project_id:
 *                  type: string
 *                  description: The id of the project.
 *             example:
 *                 form_name: "Data extraction for study"
 *                 form_description: "This is a sample data extraction form"
 *                 fields: [{field_id: "test-id", field_label: "test label", field_type:"text", field_options:"option1,option2", conditional_logic: "true", field_order: 1}, {field_id: "test-id2", field_label: "test label", field_type:"dropdown", field_options:"option1,option2", conditional_logic: "false",  field_order: 2}]
 *                 template_id: "12345"
 *                 project_id: "1234567"
 *     responses:
 *       201:
 *         description: Data extraction form created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   form_id:
 *                       type: string
 *                       description: The unique id for the new extraction form.
 *                   form_name:
 *                      type: string
 *                      description: The name of the new extraction form
 *                   form_description:
 *                      type: string
 *                      description: The description of the new extraction form.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Form name and project id are required.'
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
 *                message: 'Failed to create data extraction form.'
 */
router.post('/extraction-forms',
    [
     body('form_name').notEmpty().isString().trim().isLength({max:255}).withMessage('Form name is required, and must be a string not more than 255 characters.'),
      body('form_description').optional().isString().trim().isLength({max:1000}).withMessage('Form description must be a string not more than 1000 characters.'),
      body('fields').optional().isArray().withMessage('Fields must be an array of object.'),
      body('template_id').optional().isString().trim().custom(uuidValidate).withMessage('Invalid template id format'),
      body('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')

    ],
    async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { form_name, form_description, fields, template_id, project_id } = req.body;
    try {
        const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
        if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

        const formId = uuidv4();
        const insertFormQuery = `INSERT INTO ${EXTRACTION_FORMS_TABLE} (form_id, project_id, form_name, form_description, form_fields) VALUES (?, ?, ?, ?, ?)`;
        await executeQuery(insertFormQuery, [formId, project_id, sanitizeInput(form_name), sanitizeInput(form_description) || null, JSON.stringify(fields)]);
       const form = {
         form_id: formId,
            form_name: form_name,
           form_description: form_description
        }
        res.status(201).json(form);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to create data extraction form.');
    }
});

/**
 * @swagger
 * /extraction-forms/{form_id}:
 *   get:
 *     summary: Retrieve a specific form's structure and fields.
 *     description: Fetches details of a specific data extraction form using its ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: form_id
 *         required: true
 *         description: ID of the form to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Form details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                  form_id:
 *                    type: string
 *                    description: The unique id of the extraction form
 *                  form_name:
 *                      type: string
 *                      description: name of the extraction form
 *                  form_description:
 *                       type: string
 *                       description: description of the extraction form
 *                   form_fields:
 *                       type: array
 *                       description: array of form fields, including properties of each field.
 *                       items:
  *                        type: object
  *                        properties:
   *                              field_id:
  *                                  type: string
  *                                   description: id of the field
  *                              field_label:
  *                                type: string
  *                                  description: label of the field
   *                              field_type:
   *                                type: string
   *                                 description: type of the field
  *                              field_options:
  *                                type: string
  *                                 description: options of the field (comma separated)
  *                              conditional_logic:
  *                                 type: string
  *                                  description: conditional logic for the field
   *                              field_order:
  *                                 type: number
  *                                  description: order of the field
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                 message: 'Invalid form id format.'
 *       404:
 *         description: Form not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Form not found.'
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
 *                message: 'Failed to fetch form details.'
 */
router.get('/extraction-forms/:form_id', authenticateToken,
   [
       param('form_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid form id format')
   ],
    async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
             return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { form_id } = req.params;
    try {
          const [form] = await executeQuery(
              `SELECT form_id, form_name, form_description, form_fields FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?`,
              [form_id]
          );
          if(form.length === 0) return handleAPIError(res, null, 404, `Form with id ${form_id} not found.`);
        const formWithFields = {
              form_id: form[0].form_id,
             form_name: form[0].form_name,
           form_description: form[0].form_description,
           form_fields: JSON.parse(form[0].form_fields)
       };
       res.status(200).json(formWithFields);
    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to fetch form details.');
    }
});

/**
 * @swagger
 * /extraction-forms/{form_id}:
 *   put:
 *     summary: Update details of specific extraction form
 *     description: Updates the properties of a specific extraction form.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: form_id
 *         required: true
 *         description: ID of the form to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               form_name:
 *                 type: string
 *                 description: The name of the data extraction form.
 *               form_description:
 *                 type: string
 *                 description: The description for the data extraction form.
 *             example:
 *                 form_name: "Updated form name"
 *                 form_description: "Updated Description."
 *     responses:
 *       200:
 *         description: Extraction form updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    form_id:
 *                      type: string
 *                      description: The unique id for updated extraction form.
 *                    form_name:
 *                      type: string
 *                      description: The updated name of the form.
 *                    form_description:
 *                       type: string
 *                       description: updated description of the form.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                 message: 'Form id and updated values required.'
 *       404:
 *         description: Form not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Form not found.'
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
 *                message: 'Failed to update data extraction form.'
 */
router.put('/extraction-forms/:form_id', authenticateToken,
    [
       param('form_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid form id format'),
       body('form_name').optional().isString().trim().isLength({max:255}).withMessage('Form name must be a string not more than 255 characters.'),
       body('form_description').optional().isString().trim().isLength({max:1000}).withMessage('Form description must be a string not more than 1000 characters.')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { form_id } = req.params;
    const { form_name, form_description } = req.body;
    try {
         const [form] = await executeQuery(`SELECT form_id FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?`, [form_id])
         if(form.length === 0) return handleAPIError(res, null, 404, `Form with id ${form_id} not found.`);

         const updateQuery = `
             UPDATE ${EXTRACTION_FORMS_TABLE} SET form_name = ?, form_description = ? WHERE form_id = ?
        `;
        await executeQuery(updateQuery,[sanitizeInput(form_name) || form[0].form_name, sanitizeInput(form_description) || form[0].form_description, form_id]);
          const [updatedForm] = await executeQuery(
            `SELECT form_id, form_name, form_description FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?`,
             [form_id]
          );
         res.status(200).json(updatedForm[0]);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to update data extraction form.');
    }
});
/**
 * @swagger
 * /extraction-forms/{form_id}:
 *   delete:
 *     summary: Delete a specific extraction form
 *     description: Deletes a specific extraction form based on provided ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: form_id
 *         required: true
 *         description: ID of the form to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Extraction form deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                      type: string
 *                      description: The message returned by the system.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                 message: 'Invalid form id format'
 *       404:
 *         description: Form not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Form not found.'
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
 *                message: 'Failed to delete data extraction form.'
 */
router.delete('/extraction-forms/:form_id', authenticateToken,
    [
         param('form_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid form id format')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { form_id } = req.params;
    try {
        const [form] = await executeQuery(
            `SELECT form_id FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?`,
             [form_id]
         );
        if(form.length === 0) return handleAPIError(res, null, 404, `Form with id ${form_id} not found.`);
       const deleteQuery = `
            DELETE FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?
       `;
        await executeQuery(deleteQuery, [form_id])
        res.status(200).json({ message: 'Extraction form deleted successfully.' });
    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to delete data extraction form.');
    }
});
const express = require('express');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const pool = require('./database');
const { authenticateToken } = require('./authMiddleware');
const { sanitizeInput } = require('./utils');
const { body, validationResult, param, query } = require('express-validator');
const router = express.Router();

// Database table and column names
const EXTRACTION_FORMS_TABLE = 'extraction_forms';
const FORM_FIELDS_TABLE = 'form_fields';
const FORM_TEMPLATES_TABLE = 'form_templates';


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
// Prompt 6.1: Data Extraction Form Creation and Customization
// -----------------------------------------------------------------------------

/**
 * @swagger
 * /extraction-forms/templates:
 *   get:
 *     summary: Retrieve all extraction form templates.
 *     description: Retrieves a list of all form templates.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Extraction form templates fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   template_id:
 *                     type: string
 *                     description: The unique identifier for the extraction form template.
 *                   template_name:
 *                     type: string
 *                     description: The name of the form template.
 *                   template_description:
 *                     type: string
 *                     description: Description of the template.
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Unauthorized'
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
 *                message: 'Failed to fetch extraction form templates.'
 */
router.get('/extraction-forms/templates', authenticateToken, async (req, res) => {
    try {
        const query = `SELECT template_id, template_name, template_description FROM ${FORM_TEMPLATES_TABLE}`;
        const templates = await executeQuery(query);
        res.status(200).json(templates);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to fetch extraction form templates.');
    }
});

/**
 * @swagger
 * /extraction-forms/templates:
 *   post:
 *     summary: Creates a new data extraction form template.
 *     description: Creates a new data extraction form template.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               template_name:
 *                 type: string
 *                 description: The name of the data extraction form template.
 *               template_description:
 *                 type: string
 *                 description: The description for the data extraction form template.
 *               template_fields:
 *                   type: array
 *                   description: array of fields for the data extraction form template
 *                   items:
 *                         type: object
 *                         properties:
 *                              field_id:
 *                                  type: string
 *                                   description: id of the field
 *                              field_label:
 *                                type: string
 *                                  description: label of the field
  *                              field_type:
 *                                type: string
 *                                 description: type of the field
 *                              field_options:
 *                                type: string
 *                                 description: options of the field (comma separated)
 *                              conditional_logic:
 *                                 type: string
 *                                 description: conditional logic for the field
 *                              field_order:
  *                                 type: number
  *                                  description: order of the field
 *             example:
 *                 template_name: "Data extraction for study"
 *                 template_description: "This is a sample data extraction template"
 *                 template_fields: [{field_id: "test-id", field_label: "test label", field_type:"text", field_options:"option1,option2", conditional_logic: "true", field_order: 1}, {field_id: "test-id2", field_label: "test label", field_type:"dropdown", field_options:"option1,option2", conditional_logic: "false",  field_order: 2}]
 *     responses:
 *       201:
 *         description: Data extraction form template created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   template_id:
 *                       type: string
 *                       description: The unique id for the new extraction form template.
 *                   template_name:
 *                      type: string
 *                      description: The name of the new extraction form template
 *                   template_description:
 *                      type: string
 *                      description: The description of the new extraction form template.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Template name is required.'
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
 *                message: 'Failed to create data extraction form template.'
 */
router.post('/extraction-forms/templates', authenticateToken,
    [
      body('template_name').notEmpty().isString().trim().isLength({max:255}).withMessage('Template name is required, and must be a string not more than 255 characters.'),
        body('template_description').optional().isString().trim().isLength({max:1000}).withMessage('Template description must be a string not more than 1000 characters.'),
         body('template_fields').optional().isArray().withMessage('Template fields must be an array of objects')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { template_name, template_description, template_fields } = req.body;
    try {
        const templateId = uuidv4();
        const insertTemplateQuery =
            `INSERT INTO ${FORM_TEMPLATES_TABLE} (template_id, template_name, template_description, template_fields) VALUES (?, ?, ?, ?)`;
        await executeQuery(insertTemplateQuery, [templateId, sanitizeInput(template_name), sanitizeInput(template_description) || null, JSON.stringify(template_fields) ]);
       const template = {
           template_id: templateId,
            template_name: template_name,
          template_description: template_description
        }
        res.status(201).json(template);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to create data extraction form template.');
    }
});

/**
 * @swagger
 * /extraction-forms/templates/{template_id}:
 *   get:
 *     summary: Retrieve a specific form template's structure and fields.
 *     description: Retrieves a specific form template using its ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the template to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Form template details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                  template_id:
 *                    type: string
 *                    description: The unique id for the extraction form template
 *                  template_name:
 *                     type: string
 *                      description: name of the form template
 *                  template_description:
 *                      type: string
 *                      description: description of the form template
 *                   template_fields:
 *                       type: array
 *                       description: array of form fields, including properties of each field.
 *                       items:
  *                        type: object
  *                        properties:
   *                              field_id:
  *                                  type: string
  *                                   description: id of the field
  *                              field_label:
  *                                type: string
  *                                  description: label of the field
   *                              field_type:
   *                                type: string
   *                                 description: type of the field
  *                              field_options:
  *                                type: string
  *                                 description: options of the field (comma separated)
  *                              conditional_logic:
  *                                 type: string
  *                                  description: conditional logic for the field
   *                              field_order:
  *                                 type: number
  *                                  description: order of the field
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Invalid template id format'
 *       404:
 *         description: Form not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Template not found.'
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
 *                message: 'Failed to fetch form template details.'
 */
router.get('/extraction-forms/templates/:template_id', authenticateToken,
    [
         param('template_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid template id format')
    ],
   async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
             return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { template_id } = req.params;
    try {
        const [template] = await executeQuery(
            `SELECT template_id, template_name, template_description, template_fields FROM ${FORM_TEMPLATES_TABLE} WHERE template_id = ?`,
            [template_id]
        );
        if(template.length === 0) return handleAPIError(res, null, 404, `Template with id ${template_id} not found.`);
       const templateWithFields = {
           template_id: template[0].template_id,
            template_name: template[0].template_name,
           template_description: template[0].template_description,
         template_fields: JSON.parse(template[0].template_fields)
       }
          res.status(200).json(templateWithFields);
    } catch (error) {
      handleAPIError(res, error, 500, 'Failed to fetch form template details.');
    }
});

/**
 * @swagger
 * /extraction-forms/templates/{template_id}:
 *   put:
 *     summary: Update details of specific form template.
 *     description: Updates the properties of a specific form template.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the template to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               template_name:
 *                 type: string
 *                 description: The name of the form template.
 *               template_description:
 *                 type: string
 *                 description: The description for the template.
 *             example:
 *                 template_name: "Updated template name"
 *                 template_description: "Updated Description."
 *     responses:
 *       200:
 *         description: Form template updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   template_id:
 *                      type: string
 *                      description: The id of the template
 *                    template_name:
 *                       type: string
 *                       description: The updated name of the form template.
 *                    template_description:
 *                       type: string
 *                       description: updated description of the form template.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'template Id and updated values are required for update.'
 *       404:
 *         description: Template not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Template not found.'
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
 *                message: 'Failed to update form template.'
 */
router.put('/extraction-forms/templates/:template_id', authenticateToken,
    [
        param('template_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid template id format'),
      body('template_name').optional().isString().trim().isLength({max:255}).withMessage('Template name must be a string not more than 255 characters.'),
        body('template_description').optional().isString().trim().isLength({max:1000}).withMessage('Template description must be a string not more than 1000 characters.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { template_id } = req.params;
    const { template_name, template_description } = req.body;
        try {
              const [template] = await executeQuery(
                  `SELECT template_id FROM ${FORM_TEMPLATES_TABLE} WHERE template_id = ?`, [template_id]
              );
             if(template.length === 0) return handleAPIError(res, null, 404, `Template with id ${template_id} not found.`);
             const updateQuery = `
              UPDATE ${FORM_TEMPLATES_TABLE} SET template_name = ?, template_description = ? WHERE template_id = ?
              `;
           await executeQuery(updateQuery, [sanitizeInput(template_name) || template[0].template_name, sanitizeInput(template_description) || template[0].template_description, template_id]);
             const [updatedTemplate] = await executeQuery(
                 `SELECT template_id, template_name, template_description FROM ${FORM_TEMPLATES_TABLE} WHERE template_id = ?`,
                 [template_id]
              );
            res.status(200).json(updatedTemplate[0]);
        } catch (error) {
           handleAPIError(res, error, 500, 'Failed to update form template.');
        }
});

/**
 * @swagger
 * /extraction-forms/templates/{template_id}:
 *   delete:
 *     summary: Delete a specific extraction form template
 *     description: Deletes a specific form template based on provided ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the template to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                      type: string
 *                      description: The message returned by the system.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Invalid template id format.'
 *       404:
 *         description: Template not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Template not found.'
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
 *                message: 'Failed to delete form template.'
 */
router.delete('/extraction-forms/templates/:template_id', authenticateToken,
  [
        param('template_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid template id format')
   ],
    async (req, res) => {
        const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { template_id } = req.params;
    try {
          const [template] = await executeQuery(
              `SELECT template_id FROM ${FORM_TEMPLATES_TABLE} WHERE template_id = ?`,
              [template_id]
           );
           if(template.length === 0) return handleAPIError(res, null, 404, `Template with id ${template_id} not found.`);
            const deleteQuery = `DELETE FROM ${FORM_TEMPLATES_TABLE} WHERE template_id = ?`;
           await executeQuery(deleteQuery, [template_id]);
           res.status(200).json({ message: 'Extraction form template deleted successfully.' });
     } catch (error) {
        handleAPIError(res, error, 500, 'Failed to delete form template.');
    }
});

/**
 * @swagger
 * /extraction-forms/{form_id}/fields:
 *   get:
 *     summary: Retrieve all fields for a specific extraction form.
 *     description: Retrieves all fields for a specific form by its ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: form_id
 *         required: true
 *         description: ID of the form.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Form fields retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                    field_id:
 *                      type: string
 *                      description: The unique identifier for the form field.
 *                    field_type:
 *                      type: string
 *                      description: The type of form field.
 *                    field_label:
 *                      type: string
 *                      description: The label of the form field.
 *                    field_options:
 *                      type: string
 *                      description: Options for the field (if available)
 *                    conditional_logic:
 *                      type: string
 *                      description: conditional logic for the field
 *                    field_order:
  *                      type: number
  *                       description: order of the field
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Invalid form id format'
 *       404:
 *         description: Form not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Form not found.'
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
 *                message: 'Failed to fetch form fields.'
 */
router.get('/extraction-forms/:form_id/fields', authenticateToken,
    [
       param('form_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid form id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { form_id } = req.params;
     try {
         const [fields] = await executeQuery(
             `SELECT field_id, field_type, field_label, field_options, conditional_logic, field_order FROM ${FORM_FIELDS_TABLE} WHERE form_id = ?`,
             [form_id]
         );
         if(fields.length === 0) return handleAPIError(res, null, 404, `Form with id ${form_id} not found.`);
        res.status(200).json(fields);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to fetch form fields.');
    }
});
/**
 * @swagger
 * /extraction-forms/{form_id}/fields:
 *   post:
 *     summary: Creates a new form field.
 *     description: Creates a new form field to a specific extraction form using form ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: form_id
 *         required: true
 *         description: ID of the extraction form.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *                field_type:
 *                  type: string
 *                  description: The type of form field.
 *                field_label:
 *                   type: string
 *                   description: The label of the form field.
 *                field_options:
 *                   type: string
 *                   description: Comma separated options for a dropdown or checkbox field
 *                conditional_logic:
 *                   type: string
 *                   description: conditional logic for showing/hiding the field.
 *                 field_order:
 *                  type: number
 *                  description: The order of the field in the form.
 *             example:
 *                 field_type: "text"
 *                 field_label: "Authors name"
 *                 field_options: null
 *                 conditional_logic: null
 *                 field_order: 1
 *     responses:
 *       201:
 *         description: Form field added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    field_id:
 *                       type: string
 *                       description: The unique id for the new form field.
  *                    field_type:
 *                      type: string
 *                      description: The type of the form field.
 *                    field_label:
 *                      type: string
 *                      description: The label of the field
  *                    field_options:
 *                     type: string
  *                     description: Comma separated options for dropdown or checkbox
  *                    conditional_logic:
 *                     type: string
  *                    description: conditional logic for showing/hiding the field
  *                    field_order:
  *                      type: number
  *                      description: The order of the field in the form
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Field type and label is required.'
 *       404:
 *         description: Form not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Form not found.'
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
 *                message: 'Failed to add a new field.'
 */
router.post('/extraction-forms/:form_id/fields', authenticateToken,
    [
        param('form_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid form id format'),
        body('field_type').notEmpty().isString().trim().isLength({max:255}).withMessage('Field type is required, and must be a string not more than 255 characters.'),
      body('field_label').notEmpty().isString().trim().isLength({max:255}).withMessage('Field label is required, and must be a string not more than 255 characters.'),
        body('field_options').optional().isString().trim().isLength({max:2000}).withMessage('Field options must be a string with max 2000 characters.').optional(),
          body('conditional_logic').optional().isString().trim().isLength({max:2000}).withMessage('Conditional logic must be a string with max 2000 characters.').optional(),
          body('field_order').optional().isInt({min:0}).withMessage('Field order must be an integer greater than 0.').optional()

    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { form_id } = req.params;
        const { field_type, field_label, field_options, conditional_logic, field_order} = req.body;
        try {
             const [form] = await executeQuery(`SELECT form_id FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?`, [form_id])
            if(form.length === 0) return handleAPIError(res, null, 404, `Form with id ${form_id} not found.`);
            const fieldId = uuidv4();
            const insertFieldQuery =
                `INSERT INTO ${FORM_FIELDS_TABLE} (field_id, form_id, field_type, field_label, field_options, conditional_logic, field_order ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
           await executeQuery(insertFieldQuery, [fieldId, form_id, sanitizeInput(field_type), sanitizeInput(field_label), sanitizeInput(field_options) || null, sanitizeInput(conditional_logic) || null, field_order || null]);
            const field = {
                field_id: fieldId,
               field_type: field_type,
                field_label: field_label,
                 field_options: field_options,
                conditional_logic: conditional_logic,
                 field_order: field_order
            };
             res.status(201).json(field);
        } catch (error) {
            handleAPIError(res, error, 500, 'Failed to add a new field.');
        }
});

/**
 * @swagger
 * /extraction-forms/{form_id}/fields/{field_id}:
 *   put:
 *     summary: Updates a form field for an extraction form.
 *     description: Updates an existing form field for the extraction form based on form ID and field ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: form_id
 *         required: true
 *         description: ID of the extraction form
 *         schema:
 *           type: string
 *       - in: path
 *         name: field_id
 *         required: true
 *         description: ID of the field to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field_type:
 *                 type: string
 *                 description: The type of the form field.
 *               field_label:
 *                 type: string
 *                 description: The label of the form field.
  *               field_options:
 *                 type: string
 *                description: Comma separated options for the field
 *               conditional_logic:
 *                   type: string
 *                   description: conditional logic for the field.
*               field_order:
  *                  type: number
  *                   description: The order of the field in the form.
 *             example:
 *                 field_type: "numeric"
 *                 field_label: "Age"
 *                 field_options: null,
  *                 conditional_logic: "testField=='yes'"
  *                 field_order: 2
 *     responses:
 *       200:
 *         description: Form field updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                     field_id:
 *                       type: string
 *                       description: The unique identifier for the form field.
 *                    field_type:
 *                      type: string
 *                       description: The type of the form field.
  *                   field_label:
 *                       type: string
 *                       description: The label of the form field.
  *                   field_options:
 *                      type: string
  *                      description: comma separated values for the field.
 *                   conditional_logic:
  *                     type: string
  *                      description: The conditional logic for field.
*                   field_order:
  *                      type: number
  *                      description: The order of the field in the form.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                 message: 'Field id and updated values are required.'
 *       404:
 *         description: Field or form not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Form or field not found.'
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
 *                message: 'Failed to update form field.'
 */
 router.put('/extraction-forms/:form_id/fields/:field_id', authenticateToken,
    [
       param('form_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid form id format'),
        param('field_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid field id format'),
         body('field_type').optional().isString().trim().isLength({max:255}).withMessage('Field type must be a string not more than 255 characters.'),
        body('field_label').optional().isString().trim().isLength({max:255}).withMessage('Field label must be a string not more than 255 characters.'),
        body('field_options').optional().isString().trim().isLength({max:2000}).withMessage('Field options must be a string with max 2000 characters.').optional(),
         body('conditional_logic').optional().isString().trim().isLength({max:2000}).withMessage('Conditional logic must be a string with max 2000 characters.').optional(),
       body('field_order').optional().isInt({min:0}).withMessage('Field order must be an integer greater than 0.').optional()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { form_id, field_id } = req.params;
    const { field_type, field_label, field_options, conditional_logic, field_order } = req.body;
        try {
             const [form] = await executeQuery(
                 `SELECT form_id FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?`, [form_id]
             );
             if(form.length === 0) return handleAPIError(res, null, 404, `Form with id ${form_id} not found.`);
            const [field] = await executeQuery(
                `SELECT field_id FROM ${FORM_FIELDS_TABLE} WHERE field_id = ? AND form_id = ?`, [field_id, form_id]
            );
            if(field.length === 0) return handleAPIError(res, null, 404, `Field with id ${field_id} not found for form with id ${form_id}.`);
             const updateQuery = `
                UPDATE ${FORM_FIELDS_TABLE} SET field_type = ?, field_label = ?, field_options = ?, conditional_logic = ?, field_order = ? WHERE field_id = ? AND form_id = ?`;
            await executeQuery(updateQuery,[sanitizeInput(field_type) || field[0].field_type, sanitizeInput(field_label) || field[0].field_label, sanitizeInput(field_options) || field[0].field_options, sanitizeInput(conditional_logic) || null, field_order || null, field_id, form_id]);
              const [updatedField] = await executeQuery(
                `SELECT field_id, field_type, field_label, field_options, conditional_logic, field_order FROM ${FORM_FIELDS_TABLE} WHERE field_id = ? AND form_id = ?`,
                 [field_id, form_id]
            );
           res.status(200).json(updatedField[0]);
        } catch (error) {
           handleAPIError(res, error, 500, 'Failed to update form field.');
        }
});

/**
 * @swagger
 * /extraction-forms/{form_id}/fields/{field_id}:
 *   delete:
 *     summary: Delete a specific field for a specific form.
 *     description: Delete form field using the id of the form, and the field.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: form_id
 *         required: true
 *         description: ID of the form
 *         schema:
 *           type: string
 *       - in: path
 *         name: field_id
 *         required: true
 *         description: ID of the field to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Form field deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                      type: string
 *                      description: The message returned by the system.
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                 message: 'Invalid form or field id.'
 *       404:
 *         description: Form or field not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                     type: string
 *                     description: The message returned by the system.
 *             example:
 *                message: 'Form or field not found.'
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
 *                message: 'Failed to delete form field.'
 */
router.delete('/extraction-forms/:form_id/fields/:field_id', authenticateToken,
    [
        param('form_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid form id format'),
        param('field_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid field id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { form_id, field_id } = req.params;
    try {
        const [form] = await executeQuery(
          `SELECT form_id FROM ${EXTRACTION_FORMS_TABLE} WHERE form_id = ?`,
             [form_id]
        );
        if(form.length === 0) return handleAPIError(res, null, 404, `Form with id ${form_id} not found.`);

            const [field] = await executeQuery(
              `SELECT field_id FROM ${FORM_FIELDS_TABLE} WHERE field_id = ? AND form_id = ?`, [field_id, form_id]
            );
            if(field.length === 0) return handleAPIError(res, null, 404, `Field with id ${field_id} not found for form with id ${form_id}.`);

         const deleteQuery =
                `DELETE FROM ${FORM_FIELDS_TABLE} WHERE field_id = ? AND form_id = ?`;
        await executeQuery(deleteQuery, [field_id, form_id]);
          res.status(200).json({ message: 'Form field deleted successfully.' });
    } catch (error) {
         handleAPIError(res, error, 500, 'Failed to delete form field.');
    }
});
