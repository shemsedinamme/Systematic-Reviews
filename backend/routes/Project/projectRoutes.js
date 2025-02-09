const express = require('express');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const pool = require('./database');
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const { sanitizeInput, handleAPIError } = require('./utils');
const { body, validationResult, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const Project = require('../models/project.model');
const ProjectMetadata = require('../models/projectMetadata.model');
const Workflow = require('../models/workflow.model')
const WorkflowStage = require('../models/workflowStage.model');
const Task = require('../models/task.model');
const TaskDependency = require('../models/taskDependency.model');
const ProjectShare = require('../models/projectShare.model');
const ProjectLifecycle = require('../models/projectLifecycle.model');
const ProjectDocument = require('../models/projectDocument.model');
const ProjectFile = require('../models/projectFile.model');
const ProjectComment = require('../models/projectComment.model');
const router = express.Router();


// Database table and column names
const PROJECTS_TABLE = 'projects';
const USER_PROJECT_RELATIONS_TABLE = 'user_project_relations';
const METADATA_FIELDS_TABLE = 'metadata_fields';
const PROJECT_METADATA_TABLE = 'project_metadata';
const PROJECT_WORKFLOWS_TABLE = 'project_workflows';
const WORKFLOW_STAGES_TABLE = 'workflow_stages';
const TASKS_TABLE = 'tasks';
const TASK_DEPENDENCIES_TABLE = 'task_dependencies';
const DOCUMENTS_TABLE = 'documents';
const DOCUMENT_VERSIONS_TABLE = 'document_versions';
const COMMENTS_TABLE = 'comments';
const FILES_TABLE = 'files';
const PROJECT_ACCESS_TABLE = 'project_access';
const SHARE_LINKS_TABLE = 'share_links';


//Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again after 15 minutes',
});


router.use(limiter);
router.use(fileUpload());


// Date Validation
const isValidDate = (dateString) => {
    if(!dateString) return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString))
};


// Helper function for checking if a project exists
const projectExists = async (projectId) => {
    const [project] = await pool.query(`SELECT project_id FROM ${PROJECTS_TABLE} WHERE project_id = ?`, [projectId]);
    return project.length > 0;
};
// Workflow data retrieval helper function
const getWorkflowData = async (projectId) => {
     const workflowQuery =
         `SELECT workflow_id, workflow_name FROM ${PROJECT_WORKFLOWS_TABLE} WHERE project_id = ?`;
        const [workflows] = await pool.query(workflowQuery, [projectId]);
         if (!workflows || workflows.length === 0) {
            return null;
        }
        const workflowId = workflows[0].workflow_id;
    const workflowDataQuery = `
      SELECT
        ws.stage_id,
        ws.stage_name,
        t.task_id,
        t.task_name,
        t.assigned_user_id,
        t.due_date,
        td.dependency_id
      FROM ${WORKFLOW_STAGES_TABLE} ws
      LEFT JOIN ${TASKS_TABLE} t ON ws.stage_id = t.stage_id
      LEFT JOIN ${TASK_DEPENDENCIES_TABLE} td ON t.task_id = td.task_id
      WHERE ws.workflow_id = ?
    `;
       const workflowData = await pool.query(workflowDataQuery, [workflowId]);
     const stagesMap = new Map();
     workflowData.forEach(item => {
       if(!stagesMap.has(item.stage_id)){
        stagesMap.set(item.stage_id, {
                stage_id: item.stage_id,
                stage_name: item.stage_name,
                tasks:[]
            });
       }
       if(item.task_id){
        const stage = stagesMap.get(item.stage_id);
          stage.tasks.push({
            task_id: item.task_id,
              task_name: item.task_name,
            assigned_user_id: item.assigned_user_id,
              due_date: item.due_date,
            dependencies: item.dependency_id ? [{dependency_id: item.dependency_id}] : [],
        })
       }
     });
        const stages = Array.from(stagesMap.values());
       return { ...workflows[0], stages: stages };
};


/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     description: Creates a new project with the provided details.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the project.
 *               description:
 *                 type: string
 *                 description: The description of the project.
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: The start date of the project.
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: The end date of the project.
 *             example:
 *               title: "Sample Project"
 *               description: "This is a sample project description."
 *               start_date: "2024-01-01"
 *               end_date: "2024-12-31"
 *     responses:
 *       201:
 *         description: Project created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project_id:
 *                   type: string
 *                   description: The unique identifier of the project.
 *                 title:
 *                   type: string
 *                   description: The title of the project.
 *                 description:
 *                   type: string
 *                   description: The description of the project.
 *                 start_date:
 *                   type: string
 *                   format: date
 *                   description: The start date of the project.
 *                 end_date:
 *                   type: string
 *                   format: date
 *                   description: The end date of the project.
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
 *                message: 'Title, description, start and end dates are required.'
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
 *                message: 'Failed to create project.'
 */
router.post('/projects', authenticateToken, authorizeRole('admin'),
    [
        body('title').notEmpty().isString().trim().isLength({ max: 255 }).withMessage('Title is required and must be a string not more than 255 characters.'),
        body('description').notEmpty().isString().trim().isLength({ max: 1000 }).withMessage('Description is required and must be a string not more than 1000 characters.'),
        body('start_date').notEmpty().custom(isValidDate).withMessage('Start date is required and must be a valid date in the format YYYY-MM-DD.'),
        body('end_date').notEmpty().custom(isValidDate).withMessage('End date is required and must be a valid date in the format YYYY-MM-DD.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { title, description, start_date, end_date } = req.body;

        try {
            const projectId = uuidv4();
            const insertProjectQuery = `
          INSERT INTO ${PROJECTS_TABLE} (project_id, title, description, start_date, end_date, creation_date)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
            await pool.query(insertProjectQuery, [projectId, sanitizeInput(title), sanitizeInput(description), start_date, end_date]);

            const newProject = new Project({
               project_id: projectId,
               title: title,
                description: description,
                start_date: start_date,
                 end_date: end_date
            });
            const insertUserProjectRelationQuery =
                `INSERT INTO ${USER_PROJECT_RELATIONS_TABLE} (user_id, project_id, role) VALUES (?, ?, ?)`;
            await pool.query(insertUserProjectRelationQuery, [req.user.user_id, projectId, 'project_owner']);
             res.status(201).json(newProject.toJSON());
        } catch (error) {
           handleAPIError(res, error, 500, 'Failed to create project.');
        }
    });

/**
 * @swagger
 * /projects/search:
 *   get:
 *     summary: Search project based on metadata
 *     description: searches projects based on the query from title, description and metadata.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         description: search query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metadata fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                    project_id:
 *                      type: string
 *                      description: unique id of the project.
 *                    title:
 *                      type: string
 *                      description: The title of the project.
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
 *                message: 'Search query parameter is required.'
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
 *                message: 'Failed to search projects by metadata.'
 */
router.get('/projects/search', authenticateToken, authorizeRole('admin'),
    [
        query('query').notEmpty().isString().trim().isLength({max:255}).withMessage('Search query is required, and must be a string not more than 255 characters.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const {query} = req.query;
        try {
            const searchResultsQuery = `
            SELECT p.project_id, p.title
                 FROM ${PROJECTS_TABLE} p
                  WHERE p.title LIKE ? OR
                        p.description LIKE ? OR
                         EXISTS (SELECT 1 from ${PROJECT_METADATA_TABLE} pm JOIN ${METADATA_FIELDS_TABLE} mf on pm.field_id = mf.field_id WHERE pm.project_id = p.project_id AND (pm.value LIKE ? OR mf.field_name LIKE ?))
        `;
            const searchResults =  await pool.query(searchResultsQuery,[`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
           res.status(200).json(searchResults);
        } catch (error) {
           handleAPIError(res, error, 500, 'Failed to search projects by metadata.');
        }
    });
      
/**
 * @swagger
 * /projects/{project_id}/metadata:
 *   get:
 *     summary: Get metadata of a project
 *     description: Gets the metadata for a specific project using project ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to get the metadata.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metadata fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                     meta_id:
 *                       type: string
 *                       description: unique id for meta data item
 *                     field_name:
 *                       type: string
 *                       description: name of the meta data field
 *                     value:
 *                       type: string
 *                       description: value for the meta data field
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Project not found.'
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
 *                message: 'Failed to fetch project metadata.'
 */
router.get('/projects/:project_id/metadata', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { project_id } = req.params;

        try {
            if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

            const metadataQuery =
                `SELECT pm.meta_id, mf.field_name, pm.value
                 FROM ${PROJECT_METADATA_TABLE} pm
                 JOIN ${METADATA_FIELDS_TABLE} mf ON pm.field_id = mf.field_id
                  WHERE pm.project_id = ?`;

            const projectMetadata = await pool.query(metadataQuery, [project_id]);
             const metadataList = projectMetadata.map(meta => new ProjectMetadata(meta).toJSON());
           res.status(200).json(metadataList);
        } catch (error) {
             handleAPIError(res, error, 500, 'Failed to fetch project metadata.');
        }
    });

/**
 * @swagger
 * /projects/{project_id}/metadata:
 *   post:
 *     summary: Add new metadata to a project
 *     description: Adds new metadata to a specific project using project ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to add the metadata.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field_name:
 *                 type: string
 *                 description: The name of the metadata field.
 *               value:
 *                 type: string
 *                 description: The value for the metadata field.
 *             example:
 *                 field_name: "author"
 *                 value: "John Doe"
 *     responses:
 *       201:
 *         description: New metadata added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta_id:
 *                   type: string
 *                   description: The unique identifier of the meta data item.
 *                 field_name:
 *                    type: string
 *                    description: The name of the meta data field
 *                 value:
 *                   type: string
 *                   description: The value for the metadata field.
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
 *                message: 'Metadata field name is required'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Project not found.'
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
 *                message: 'Failed to add project metadata.'
 */
router.post('/projects/:project_id/metadata', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
        body('field_name').notEmpty().isString().trim().isLength({max:255}).withMessage('Metadata field name is required and must be a string not more than 255 characters.'),
        body('value').optional().isString().trim().isLength({max:1000}).withMessage('Metadata value must be a string not more than 1000 characters.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { project_id } = req.params;
        const { field_name, value } = req.body;
        try {
             if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

            //check if metadata field exists
            let metaFieldQuery = `SELECT * from ${METADATA_FIELDS_TABLE} WHERE field_name = ?`;
            let metaField = await pool.query(metaFieldQuery, [field_name]);

            let fieldId;
            if(metaField.length === 0){
                 fieldId = uuidv4();
                const insertMetaFieldQuery = `INSERT INTO ${METADATA_FIELDS_TABLE} (field_id, field_name) VALUES (?, ?)`;
               await pool.query(insertMetaFieldQuery, [fieldId, field_name])
              metaField = [{field_id: fieldId, field_name: field_name}];
            } else {
               fieldId = metaField[0].field_id;
            }
             const metaId = uuidv4();
            const insertProjectMetadataQuery =
                `INSERT INTO ${PROJECT_METADATA_TABLE} (meta_id, project_id, field_id, value) VALUES (?, ?, ?, ?)`;
            await pool.query(insertProjectMetadataQuery, [metaId, project_id, fieldId, value || null]);

            const newProjectMetadata = new ProjectMetadata({
                 meta_id: metaId,
                field_name: field_name,
                 value: value
            });
            res.status(201).json(newProjectMetadata.toJSON());
        } catch (error) {
            handleAPIError(res, error, 500, 'Failed to add project metadata.');
        }
    });

/**
 * @swagger
 * /projects/{project_id}/metadata:
 *   put:
 *     summary: Update metadata of a project
 *     description: Updates existing metadata of a specific project using project ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to update the metadata.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meta_id:
 *                 type: string
 *                 description: The unique identifier of the meta data item.
 *               value:
 *                 type: string
 *                 description: The new value for the metadata field.
 *             example:
 *                 meta_id: "6b7b6172-d59c-4f12-9e7d-6527d0e210d1"
 *                 value: "Jane Doe"
 *     responses:
 *       200:
 *         description: Metadata updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    meta_id:
 *                       type: string
 *                       description: unique id for meta data item
 *                    field_name:
 *                       type: string
 *                       description: name of the meta data field
 *                    value:
 *                       type: string
 *                       description: value for the meta data field
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
 *                message: 'Metadata Id and Value required for update.'
 *       404:
 *          description: metadata not found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Metadata not found.'
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
 *                message: 'Failed to update project metadata.'
 */
router.put('/projects/:project_id/metadata', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
        body('meta_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Metadata id is required and must be a valid uuid.'),
        body('value').notEmpty().isString().trim().isLength({max:1000}).withMessage('Metadata value is required and must be string with maximum of 1000 characters.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { project_id } = req.params;
        const { meta_id, value } = req.body;
        try {
              if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

            const [metadataItem] = await pool.query(`SELECT meta_id, mf.field_name FROM ${PROJECT_METADATA_TABLE} pm JOIN ${METADATA_FIELDS_TABLE} mf on pm.field_id = mf.field_id WHERE pm.meta_id = ? AND pm.project_id = ?`, [meta_id, project_id]);
            if(!metadataItem || metadataItem.length === 0) return handleAPIError(res, null, 404, `Metadata with id ${meta_id} not found for the project ${project_id}.`);

            const updateQuery = `
                UPDATE ${PROJECT_METADATA_TABLE} SET value = ? WHERE meta_id = ?`;
            await pool.query(updateQuery, [value, meta_id]);
           const [updatedMetadata] = await pool.query(`SELECT pm.meta_id, mf.field_name, pm.value
                FROM ${PROJECT_METADATA_TABLE} pm
                JOIN ${METADATA_FIELDS_TABLE} mf ON pm.field_id = mf.field_id
                WHERE pm.meta_id = ?`, [meta_id]);

            const updatedMetaObj = new ProjectMetadata(updatedMetadata[0]);
           res.status(200).json(updatedMetaObj.toJSON());
        } catch (error) {
           handleAPIError(res, error, 500, 'Failed to update project metadata.');
        }
});

/**
 * @swagger
 * /projects/{project_id}/workflows:
 *   get:
 *     summary: Get workflows for a project.
 *     description: Gets workflows for a project based on project ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to get the workflow.
 *         schema:
 *           type: string
  *     responses:
 *       200:
 *         description: Workflow fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   workflow_id:
 *                     type: string
 *                     description: id of the workflow
 *                   workflow_name:
 *                      type: string
 *                      description: name of the workflow.
 *                   stages:
 *                      type: array
 *                      description: array of workflow stages
 *                      items:
 *                           type: object
 *                           properties:
 *                              stage_id:
 *                                 type: string
 *                                 description: id of the workflow stage
 *                              stage_name:
 *                                type: string
 *                                description: name of the workflow stage
 *                              tasks:
 *                                  type: array
 *                                  description: array of tasks for this stage
 *                                  items:
 *                                       type: object
 *                                       properties:
 *                                          task_id:
 *                                             type: string
 *                                             description: id of the task
 *                                          task_name:
 *                                            type: string
 *                                            description: name of the task
 *                                          assigned_user_id:
 *                                            type: string
 *                                            description: id of the user assigned to this task
 *                                          due_date:
 *                                            type: string
 *                                            description: due date of the task
 *                                          dependencies:
 *                                              type: array
 *                                              description: array of dependencies for the task
 *                                              items:
 *                                                   type: object
 *                                                     properties:
 *                                                       dependency_id:
 *                                                        type: string
 *                                                        description: id of the dependency
 *       404:
 *          description: Workflow not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'No workflow found for this project.'
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
 *                message: 'Failed to fetch project workflows.'
 */
router.get('/projects/:project_id/workflows', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { project_id } = req.params;
        try {
           if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

            const workflowData = await getWorkflowData(project_id);
            if (!workflowData) return handleAPIError(res, null, 404, 'No workflow found for this project.');

             res.status(200).json(workflowData);
        } catch (error) {
           handleAPIError(res, error, 500, 'Failed to fetch project workflows.');
        }
    });

/**
 * @swagger
 * /projects/{project_id}/workflows:
 *   post:
 *     summary: Create a new workflow for a project
 *     description: Creates a new workflow for a project based on project ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to add the workflow.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *                 workflow_name:
 *                   type: string
 *                   description: name of the new workflow
 *             example:
 *                workflow_name: "Systematic Review Workflow"
 *     responses:
 *       201:
 *         description: Workflow created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   workflow_id:
 *                     type: string
 *                     description: The id of the new workflow
 *                   workflow_name:
 *                     type: string
 *                     description: The name of the new workflow
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Project not found.'
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
 *                message: 'Failed to create project workflow.'
 */
router.post('/projects/:project_id/workflows', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
        body('workflow_name').optional().isString().trim().isLength({max:255}).withMessage('Workflow name must be a string not more than 255 characters.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { project_id } = req.params;
        const { workflow_name } = req.body;
        try {
             if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
            const workflowId = uuidv4();
            const insertWorkflowQuery =
                `INSERT INTO ${PROJECT_WORKFLOWS_TABLE} (workflow_id, project_id, workflow_name) VALUES (?, ?, ?) `;
             await pool.query(insertWorkflowQuery,[workflowId, project_id, workflow_name || 'default']);
            const newWorkflow = new Workflow({
               workflow_id: workflowId,
               project_id: project_id,
               workflow_name: workflow_name
           })
            res.status(201).json(newWorkflow.toJSON());
        } catch (error) {
            handleAPIError(res, error, 500, 'Failed to create project workflow.');
        }
});

/**
 * @swagger
 * /workflows/{workflow_id}/stages:
 *   post:
 *     summary: Adds new stage to a workflow.
 *     description: Adds a new stage to the workflow by workflow ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflow_id
 *         required: true
 *         description: ID of the workflow to add the stage.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage_name:
 *                 type: string
 *                 description: The name of the stage.
 *             example:
 *                 stage_name: "Data Extraction"
 *     responses:
 *       201:
 *         description: Workflow stage added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    stage_id:
 *                      type: string
 *                      description: The unique identifier for workflow stage
 *                    stage_name:
 *                      type: string
 *                      description: name of the workflow stage
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
 *                 message: 'Stage name is required.'
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
 *                message: 'Failed to add a new workflow stage.'
 */
router.post('/workflows/:workflow_id/stages', authenticateToken, authorizeRole('admin'),
    [
        param('workflow_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid workflow id format'),
        body('stage_name').notEmpty().isString().trim().isLength({max:255}).withMessage('Stage name is required, and must be a string not more than 255 characters.')
    ],
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { workflow_id } = req.params;
    const { stage_name } = req.body;
    try {
          const [workflow] =  await pool.query(`SELECT workflow_id FROM ${PROJECT_WORKFLOWS_TABLE} WHERE workflow_id = ?`, [workflow_id]);
           if(workflow.length === 0) return handleAPIError(res, null, 404, `workflow with id ${workflow_id} not found`);
        const stageId = uuidv4();
        const insertStageQuery = `
        INSERT INTO ${WORKFLOW_STAGES_TABLE} (stage_id, workflow_id, stage_name) VALUES (?, ?, ?) `;
        await pool.query(insertStageQuery, [stageId, workflow_id, sanitizeInput(stage_name)]);
          const newStage = new WorkflowStage({
            stage_id: stageId,
              workflow_id: workflow_id,
            stage_name: stage_name
        });
          res.status(201).json(newStage.toJSON());
    } catch (error) {
         handleAPIError(res, error, 500, 'Failed to add a new workflow stage.');
    }
});

/**
 * @swagger
 * /stages/{stage_id}/tasks:
 *   post:
 *     summary: Adds new task to a workflow stage.
 *     description: Adds a new task to the workflow stage based on stage ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stage_id
 *         required: true
 *         description: ID of the workflow stage to add a task.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               task_name:
 *                 type: string
 *                 description: The name of the task.
 *             example:
 *                 task_name: "Extract data from the articles"
 *     responses:
 *       201:
 *         description: Task added to a workflow stage successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    task_id:
 *                      type: string
 *                      description: The unique identifier for workflow task
 *                    task_name:
 *                      type: string
 *                      description: name of the workflow task
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
 *                message: 'Task name is required.'
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
 *                message: 'Failed to add a new task.'
 */
router.post('/stages/:stage_id/tasks', authenticateToken, authorizeRole('admin'),
    [
        param('stage_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid stage id format'),
        body('task_name').notEmpty().isString().trim().isLength({max:255}).withMessage('Task name is required, and must be a string not more than 255 characters.')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
         const { stage_id } = req.params;
        const { task_name } = req.body;
        try {
            const [stage] = await pool.query(`SELECT stage_id FROM ${WORKFLOW_STAGES_TABLE} WHERE stage_id = ?`, [stage_id]);
            if(stage.length === 0) return handleAPIError(res, null, 404, `Stage with id ${stage_id} not found`);
            const taskId = uuidv4();
            const insertTaskQuery = `
              INSERT INTO ${TASKS_TABLE} (task_id, stage_id, task_name) VALUES (?, ?, ?) `;
           await pool.query(insertTaskQuery, [taskId, stage_id, sanitizeInput(task_name)]);
            const newTask = new Task({
                task_id: taskId,
                stage_id: stage_id,
                task_name: task_name
            });
            res.status(201).json(newTask.toJSON());
        } catch (error) {
            handleAPIError(res, error, 500, 'Failed to add a new task.');
        }
    });
/**
 * @swagger
 * /tasks/{task_id}/assign:
 *   post:
 *     summary: Assign a user to a task.
 *     description: Assign a user to a task using task ID and user ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to assign the user.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: The id of the user to assign the task.
 *               due_date:
 *                 type: string
 *                 description: The due date of the task.
 *             example:
 *                 user_id: "6b7b6172-d59c-4f12-9e7d-6527d0e210d1"
 *                 due_date: "2024-12-20"
 *     responses:
 *       200:
 *         description: Task assigned to user successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    task_id:
 *                      type: string
 *                      description: The unique identifier for workflow task
 *                    task_name:
 *                      type: string
 *                      description: name of the workflow task
 *                   assigned_user_id:
 *                      type: string
 *                      description: id of the user assigned to the task
 *                   due_date:
 *                      type: string
 *                      description: due date of the task
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
 *                message: 'User id required.'
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
 *                message: 'Failed to assign the task.'
 */
router.post('/tasks/:task_id/assign', authenticateToken, authorizeRole('admin'),
    [
        param('task_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid task id format'),
       body('user_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('User id is required and must be a valid uuid'),
       body('due_date').optional().custom(isValidDate).withMessage('Due date must be a valid date in the format YYYY-MM-DD.')
    ],
    async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { task_id } = req.params;
    const { user_id, due_date } = req.body;
    try {
          const taskExists = await pool.query(`SELECT task_id FROM ${TASKS_TABLE} WHERE task_id = ?`, [task_id]);
         if(taskExists.length === 0) return handleAPIError(res, null, 404, `Task with id ${task_id} not found`);
        const [user] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [user_id])
        if (user.length === 0) return handleAPIError(res, null, 404, `User with id ${user_id} not found`);
        const updateTaskQuery = `
            UPDATE ${TASKS_TABLE} SET assigned_user_id = ?, due_date = ? WHERE task_id = ?
        `;
        await pool.query(updateTaskQuery,[user_id, due_date, task_id]);
         const [updatedTask] = await pool.query(`SELECT task_id, task_name, assigned_user_id, due_date FROM ${TASKS_TABLE} WHERE task_id = ?`,[task_id])

        const assignedTask = new Task(updatedTask[0]);
        res.status(200).json(assignedTask.toJSON());
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to assign the task.');
    }
});

/**
 * @swagger
 * /tasks/{task_id}/dependencies:
 *   post:
 *     summary: Add a dependency to a task
 *     description: Adds a dependency for a task using task ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to add dependency.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dependency_id:
 *                 type: string
 *                 description: The id of the task that is dependency.
 *             example:
 *                 dependency_id: "6b7b6172-d59c-4f12-9e7d-6527d0e210d1"
 *     responses:
 *       200:
 *         description: Task dependency added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    task_id:
 *                      type: string
 *                      description: The unique identifier for workflow task
  *                    task_name:
 *                      type: string
 *                      description: name of the workflow task
 *                   dependencies:
 *                      type: array
 *                      items:
 *                          type: object
 *                          properties:
 *                            dependency_id:
 *                               type: string
 *                               description: id of dependency for the task
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
 *                 message: 'Invalid dependency id.'
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
 *                message: 'Failed to add task dependency.'
 */
router.post('/tasks/:task_id/dependencies', authenticateToken, authorizeRole('admin'),
    [
        param('task_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid task id format'),
        body('dependency_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid dependency id format')
    ],
     async (req, res) => {
      const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { task_id } = req.params;
    const { dependency_id } = req.body;
    try {
        const taskExists = await pool.query(`SELECT task_id FROM ${TASKS_TABLE} WHERE task_id = ?`, [task_id]);
          if(taskExists.length === 0) return handleAPIError(res, null, 404, `Task with id ${task_id} not found`);

        const [dependencyTask] = await pool.query(`SELECT task_id FROM ${TASKS_TABLE} WHERE task_id = ?`, [dependency_id]);
         if(dependencyTask.length === 0) return handleAPIError(res, null, 404, `Task with id ${dependency_id} not found.`);

        const dependencyQuery =
            `INSERT INTO ${TASK_DEPENDENCIES_TABLE} (dependency_id, task_id) VALUES (?, ?) `;
         await pool.query(dependencyQuery,[dependency_id, task_id]);
      const [updatedTask] = await pool.query(`SELECT task_id, task_name FROM ${TASKS_TABLE} WHERE task_id = ?`,[task_id])

        const [dependencies] = await pool.query(`SELECT dependency_id FROM ${TASK_DEPENDENCIES_TABLE} WHERE task_id = ?`,[task_id])
          const taskWithDependencies = {
            ...updatedTask[0],
            dependencies: dependencies.map(dep=> new TaskDependency(dep).toJSON())
          }
           res.status(200).json(taskWithDependencies);
    } catch (error) {
         handleAPIError(res, error, 500, 'Failed to add task dependency.');
    }
});

/**
 * @swagger
 * /projects/{project_id}/share:
 *   post:
 *     summary: Share a project with a user or generate a share link.
 *     description: Allows a project to be shared with another user or a shareable link to be created for the project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project being shared.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *                share_with:
 *                  type: string
 *                  description: The email or username of the user to share the project with.
 *                access_type:
 *                  type: string
 *                  description: The access type for the shared project ("read-only", "read-write").
 *                password:
 *                  type: string
 *                  description: password for shareable link
 *                share_link:
 *                  type: boolean
 *                  description: whether the shareable link should be generated
 *             example:
 *                 share_with: "johndoe@example.com"
 *                 access_type: "read-only"
 *                 share_link: false
 *     responses:
 *       200:
 *         description: Project shared successfully or shareable link generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                     type: string
 *                     description: status message about project share
  *                 share_link:
 *                      type: string
 *                      description: shareable link to the project if generated.
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'User does not exist'
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
 *                message: 'Failed to share project.'
 */
router.post('/projects/:project_id/share', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
        body('share_with').optional().isString().trim().withMessage('Share with must be a string.'),
        body('access_type').optional().isIn(['read-only', 'read-write']).withMessage('Access type must be read-only or read-write'),
        body('password').optional().isString().trim().isLength({min:8}).withMessage('Password must be at least 8 characters.'),
        body('share_link').optional().isBoolean().withMessage('Share link must be a boolean')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.params;
    const { share_with, access_type, password, share_link } = req.body;
    try {
        if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        if(share_link){
            const shareableLinkId = uuidv4();
            const hashedPassword = password ? await hashPassword(password) : null
            const insertShareLinkQuery = `
                INSERT INTO ${SHARE_LINKS_TABLE} (share_link_id, project_id, password) VALUES (?, ?, ?)
            `;
            await pool.query(insertShareLinkQuery, [shareableLinkId, project_id, hashedPassword]);
            const newProjectShare = new ProjectShare({
                share_link_id: shareableLinkId,
                project_id: project_id,
                password: hashedPassword
             })
            res.status(200).json({message: 'Shareable link generated.', share_link: `http://localhost:3000/projects/shared/${shareableLinkId}` });
            return;
        }
        const [user] = await pool.query('SELECT user_id FROM users WHERE email = ? OR username = ?', [share_with, share_with]);
       if(user.length === 0) return handleAPIError(res, null, 404, `User with username/email ${share_with} not found`)
        const insertProjectAccessQuery =
           `INSERT INTO ${PROJECT_ACCESS_TABLE} (project_id, user_id, access_type) VALUES (?, ?, ?)`;
        await pool.query(insertProjectAccessQuery,[project_id, user[0].user_id, access_type || 'read-only']);
        res.status(200).json({ message: 'Project shared successfully.' });
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to share project.');
    }
});

/**
 * @swagger
 * /projects/{project_id}/share:
 *   get:
 *     summary: Get a shareable link for a project
 *     description: Creates and fetches a shareable link for a specific project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to generate the share link
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shareable link generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 share_link:
 *                   type: string
 *                   description: The generated shareable link for the project.
 *       404:
 *          description: Shareable link not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                   message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Shareable link not found.'
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
 *                message: 'Failed to generate project link'
 */
router.get('/projects/:project_id/share', authenticateToken, authorizeRole('admin'),
    [
         param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
    ],
    async (req, res) => {
          const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const {project_id} = req.params;
    try {
          if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const [shareLink] = await pool.query(`SELECT share_link_id, password FROM ${SHARE_LINKS_TABLE} WHERE project_id = ?`,[project_id])
        if(shareLink.length === 0) return handleAPIError(res, null, 404, `Shareable link not found for project with id ${project_id}.`)
           const newProjectShare = new ProjectShare(shareLink[0]);
        res.status(200).json({share_link: `http://localhost:3000/projects/shared/${shareLink[0].share_link_id}`, password: newProjectShare.password});
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to generate project link');
    }
});

/**
 * @swagger
 * /projects/{project_id}/lifecycle:
 *   get:
 *     summary: Get project lifecycle state
 *     description: gets the project lifecycle state based on project ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to get the lifecycle state.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project lifecycle state fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   type: string
 *                   description: state of the project in its lifecycle.
 *       404:
 *          description: Project not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Project does not exist'
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
 *                message: 'Failed to fetch project lifecycle state'
 */
router.get('/projects/:project_id/lifecycle', authenticateToken, authorizeRole('admin'),
    [
         param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
    ],
     async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.params;
    try {
           if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} does not exist`);
        const [project] = await pool.query('SELECT status, project_id FROM projects WHERE project_id = ?', [project_id]);
          const projectLifecycle = new ProjectLifecycle({
             project_id: project[0].project_id,
             status: project[0].status
          })
        res.status(200).json(projectLifecycle.toJSON());
    } catch (error) {
      handleAPIError(res, error, 500, 'Failed to fetch project lifecycle state');
    }
});

/**
 * @swagger
 * /projects/{project_id}/{action}:
 *   post:
 *     summary: transition the project to different lifecycle phase
 *     description: transition the project to different lifecycle phase by providing the action.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to be transitioned
 *         schema:
 *           type: string
 *       - in: path
 *         name: action
 *         required: true
 *         description: Action to transition to (initiation, planning, execution, monitoring, closure).
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project lifecycle transitioned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   type: string
 *                   description: The state to which project transitioned.
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
 *                message: 'Invalid action'
 *       404:
 *          description: Project not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Project not found'
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
 *                message: 'Failed to transition project lifecycle.'
 */
router.post('/projects/:project_id/:action', authenticateToken, authorizeRole('admin'),
    [
       param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
       param('action').notEmpty().isIn(['initiation', 'planning', 'execution', 'monitoring', 'closure']).withMessage('Invalid action')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id, action } = req.params;
    try {
          if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} does not exist`);
        const updateQuery = `UPDATE ${PROJECTS_TABLE} SET status = ? WHERE project_id = ?`;
        await pool.query(updateQuery, [action, project_id]);
       const newProjectLifecycle = new ProjectLifecycle({
          project_id: project_id,
           status: action
       })
        res.status(200).json(newProjectLifecycle.toJSON());
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to transition project lifecycle.');
    }
});

/**
 * @swagger
 * /projects/{project_id}/documents/{document_id}:
 *   get:
 *     summary: Get document of a project
 *     description: Gets the document of a project using project and document IDs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: string
 *       - in: path
 *         name: document_id
 *         required: true
 *         description: ID of the document
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document content fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   document_id:
 *                     type: string
 *                     description: The id of the document
 *                   content:
 *                      type: string
 *                      description: The content of the document
 *       404:
 *          description: Document not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                   message:
 *                      type: string
 *                      description: The message returned by the system.
 *              example:
 *                message: 'Document not found.'
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
 *                message: 'Failed to fetch the document.'
 */
router.get('/projects/:project_id/documents/:document_id', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
       param('document_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid document id format')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id, document_id } = req.params;
    try {
          if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const [document] = await pool.query('SELECT document_id, content FROM documents WHERE project_id = ? AND document_id = ?', [project_id, document_id]);
        if (document.length === 0) return handleAPIError(res, null, 404, `Document with id ${document_id} not found.`);
           const newDocument = new ProjectDocument(document[0]);
         res.status(200).json(newDocument.toJSON());
    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to fetch the document.');
    }
});

/**
 * @swagger
 * /projects/{project_id}/documents/{document_id}:
 *   put:
 *     summary: updates the document
 *     description: updates document content using project ID and document ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: string
 *       - in: path
 *         name: document_id
 *         required: true
 *         description: ID of the document
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: content of the document
 *             example:
 *                 content: "Document content"
 *     responses:
 *       200:
 *         description: Document updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   document_id:
 *                     type: string
 *                     description: The id of the document
 *                   content:
 *                      type: string
 *                      description: The content of the document
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                      type: string
 *                      description: The message returned by the system.
 *              example:
 *                  message: 'Content is required.'
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
 *                message: 'Failed to save document content'
 */
router.put('/projects/:project_id/documents/:document_id', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
       param('document_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid document id format'),
       body('content').notEmpty().isString().trim().isLength({max:5000}).withMessage('Content is required and must be a string not more than 5000 characters.')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
     const { project_id, document_id } = req.params;
    const { content } = req.body;
    try {
        if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const [document] = await pool.query(
            'SELECT content FROM documents WHERE document_id = ?', [document_id]
        );
         if(document.length === 0){
             const docId = uuidv4();
             const insertDocumentQuery =
                 `INSERT INTO ${DOCUMENTS_TABLE} (document_id, project_id, content) VALUES (?, ?, ?) `;
             await pool.query(insertDocumentQuery, [docId, project_id, sanitizeInput(content)]);
               const newDocument = new ProjectDocument({
                  document_id: docId,
                project_id: project_id,
                 content: content
               })
             res.status(200).json(newDocument.toJSON());
             return;
        }
        const updateDocumentQuery = `
            UPDATE ${DOCUMENTS_TABLE} SET content = ? WHERE document_id = ?
        `;
        await pool.query(updateDocumentQuery, [sanitizeInput(content), document_id]);
        const insertDocumentVersionQuery = `
            INSERT INTO ${DOCUMENT_VERSIONS_TABLE} (version_id, document_id, content) VALUES (?, ?, ?)`;
       await pool.query(insertDocumentVersionQuery, [uuidv4(), document_id, sanitizeInput(content)]);
        const updatedDocument = new ProjectDocument({
           document_id: document_id,
            content: content
        })
        res.status(200).json(updatedDocument.toJSON());
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to save document content');
    }
});

/**
 * @swagger
 * /projects/{project_id}/documents/{document_id}/version:
 *   get:
 *     summary: Gets versions history of the project document.
 *     description: Gets version history of a document using project id and document id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project
 *         schema:
 *           type: string
 *       - in: path
 *         name: document_id
 *         required: true
 *         description: ID of the document
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fetched document version history successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                     version_id:
 *                       type: string
 *                       description: id of the document version.
 *                     version_date:
 *                        type: string
 *                        format: date-time
 *                        description: version date of the document.
 *       404:
 *         description: Document not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *              example:
 *                message: 'Document not found.'
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
 *                message: 'Failed to fetch version history'
 */
router.get('/projects/:project_id/documents/:document_id/version', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
       param('document_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid document id format')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { document_id } = req.params;
    try {
         if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const [versionHistory] = await pool.query(
            `SELECT version_id, version_date FROM ${DOCUMENT_VERSIONS_TABLE} WHERE document_id = ?`,
            [document_id]
        );
         res.status(200).json(versionHistory);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to fetch version history');
    }
});

/**
 * @swagger
 * /documents/{document_id}/versions/{versionId}/revert:
 *   post:
 *     summary: Reverts a project document to a specified version.
 *     description: Reverts project document to specified version using document ID and version ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         description: ID of the document.
 *         schema:
 *           type: string
 *       - in: path
 *         name: versionId
 *         required: true
 *         description: ID of the version to revert to.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document reverted to the specified version successfully.
  *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    document_id:
 *                      type: string
 *                      description: The id of the document
 *                    content:
 *                      type: string
 *                      description: content of the document
 *       404:
 *          description: version is not found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                   message:
 *                      type: string
 *                      description: The message returned by the system.
 *              example:
 *                 message: 'version is not found'
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
 *                message: 'Failed to revert to a version.'
 */
router.post('/documents/:document_id/versions/:versionId/revert', authenticateToken, authorizeRole('admin'),
    [
        param('document_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid document id format'),
       param('versionId').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid version id format')
    ],
     async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { document_id, versionId } = req.params;
    try {
        const [documentExists] = await pool.query(`SELECT document_id FROM ${DOCUMENTS_TABLE} WHERE document_id = ?`, [document_id]);
        if(documentExists.length === 0) return handleAPIError(res, null, 404, `Document with id ${document_id} not found.`);
          const [version] = await pool.query(
            `SELECT content, version_id FROM ${DOCUMENT_VERSIONS_TABLE} WHERE version_id = ? AND document_id = ?`,
            [versionId, document_id]
        );
        if(version.length === 0) return handleAPIError(res, null, 404, `Version with id ${versionId} not found for document with id ${document_id}.`);

          const updateDocumentQuery = `UPDATE ${DOCUMENTS_TABLE} SET content = ? WHERE document_id = ?`;
         await pool.query(updateDocumentQuery, [version[0].content, document_id]);
           const updatedDocument = new ProjectDocument({
             document_id: document_id,
             content: version[0].content
           });
        res.status(200).json(updatedDocument.toJSON());
    } catch (error) {
      handleAPIError(res, error, 500, 'Failed to revert to a version.');
    }
});

/**
 * @swagger
 * /projects/{project_id}/files:
 *   get:
 *     summary: Get files of a project
 *     description: Gets files of a project based on project ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to get the files from
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Files fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                     file_id:
 *                       type: string
 *                       description: id of the file.
 *                     file_path:
 *                       type: string
 *                       description: path of the file.
 *                     file_name:
 *                       type: string
 *                       description: name of the file.
 *       404:
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                      type: string
 *                      description: The message returned by the system.
 *              example:
 *                message: 'Project not found.'
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
 *                message: 'Failed to fetch files'
 */
router.get('/projects/:project_id/files', authenticateToken, authorizeRole('admin'),
    [
         param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const { project_id } = req.params;
        try {
             if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
            const [files] = await pool.query(
                `SELECT file_id, file_path, file_name FROM ${FILES_TABLE} WHERE project_id = ?`,
                [project_id]
            );
             const fileList = files.map(file => new ProjectFile(file).toJSON());
             res.status(200).json(fileList);
        } catch (error) {
           handleAPIError(res, error, 500, 'Failed to fetch files');
        }
    });

/**
 * @swagger
 * /projects/{project_id}/files:
 *   post:
 *     summary: Uploads a new file to a project.
 *     description: upload a file to the project using project ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to add the file.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    file_id:
 *                      type: string
 *                      description: id of the file
 *                    file_path:
 *                      type: string
 *                      description: path of the uploaded file
 *                   file_name:
 *                      type: string
 *                      description: name of the file
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
 *                message: 'No file was uploaded.'
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
 *                message: 'File upload failed'
 */
router.post('/projects/:project_id/files', authenticateToken, authorizeRole('admin'),
    [
       param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.params;
    try {
        if(!req.files || !req.files.file) {
            return res.status(400).json({message: 'No file was uploaded'});
        }
         if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const file = req.files.file;
       if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('application/pdf')) {
             return res.status(400).json({message: 'Only image and pdf file format allowed.'});
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
             return res.status(400).json({message: 'File size should not exceed 5MB.'});
        }
         const file_name = file.name;
          //TODO: replace with cloud file storage
        const file_path = `/uploads/${file.name}` //save files to upload folder
          await file.mv(`./uploads/${file.name}`);
        const fileId = uuidv4();
        const insertFileQuery =
            `INSERT INTO ${FILES_TABLE} (file_id, project_id, file_path, file_name) VALUES (?, ?, ?, ?) `;
          await pool.query(insertFileQuery,[fileId, project_id, file_path, sanitizeInput(file_name)]);
        const newFile = new ProjectFile({
          file_id: fileId,
          file_path: file_path,
         file_name: file_name
         })
        res.status(201).json(newFile.toJSON());
    } catch (error) {
         handleAPIError(res, error, 500, 'File upload failed');
    }
});

/**
 * @swagger
 * /projects/{project_id}/comments:
 *   get:
 *     summary: Get comments for a project
 *     description: Gets all comments of a project based on project ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to get the comments from
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comments fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                     comment_id:
 *                       type: string
 *                       description: id of the comment.
 *                     text:
 *                       type: string
 *                       description: text of the comment
  *       404:
 *          description: Project not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                   message:
 *                      type: string
 *                      description: The message returned by the system.
 *              example:
 *                message: 'Project not found.'
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
 *                message: 'Failed to fetch comments.'
 */
router.get('/projects/:project_id/comments', authenticateToken, authorizeRole('admin'),
    [
        param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
     async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.params;
    try {
        if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const [comments] = await pool.query(
            'SELECT comment_id, text, created_at FROM comments WHERE project_id = ?',
            [project_id]
        );
        const commentList = comments.map(comment => new ProjectComment(comment).toJSON());
        res.status(200).json(commentList);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to fetch comments.');
    }
});

/**
 * @swagger
 * /projects/{project_id}/comments:
 *   post:
 *     summary: add a new comment to a project
 *     description: adds a new comment to a project using project ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         description: ID of the project to add the comment.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: The comment message
 *             example:
 *                 text: "This is a test comment"
 *     responses:
 *       201:
 *         description: comment added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    comment_id:
 *                      type: string
 *                      description: id of the comment
 *                    text:
 *                      type: string
 *                      description: text of the comment
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                     type: string
 *                     description: The message returned by the system.
 *              example:
 *                message: 'Comment text is required.'
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
 *                message: 'Failed to add comment'
 */
router.post('/projects/:project_id/comments', authenticateToken, authorizeRole('admin'),
    [
       param('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
        body('text').notEmpty().isString().trim().isLength({max:1000}).withMessage('Comment text is required, and must be a string not more than 1000 characters.')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.params;
    const { text } = req.body;
    try {
         if (!await projectExists(project_id)) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const commentId = uuidv4();
        const insertCommentQuery = `
            INSERT INTO ${COMMENTS_TABLE} (comment_id, project_id, user_id, text, created_at) VALUES (?, ?, ?, ?, NOW())
        `;
        await pool.query(insertCommentQuery, [commentId, project_id, req.user.user_id, sanitizeInput(text)]);
         const newComment = new ProjectComment({
           comment_id: commentId,
          text: text,
           project_id: project_id,
           user_id: req.user.user_id
        })
        res.status(201).json(newComment.toJSON());
    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to add comment');
    }
});

module.exports = router;
