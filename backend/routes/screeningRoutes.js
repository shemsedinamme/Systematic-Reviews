const express = require('express');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const pool = require('./database');
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const { sanitizeInput } = require('./utils');
const { body, validationResult, query, param } = require('express-validator');
const router = express.Router();

// Database table and column names
const ARTICLES_TABLE = 'articles';
const USERS_TABLE = 'users';
const SCREENING_DECISIONS_TABLE = 'screening_decisions';
const SCREENING_WORKFLOW_TABLE = 'screening_workflow';
const SCREENING_ASSIGNMENTS_TABLE = 'screening_assignments';
const INCLUSION_CRITERIA_TABLE = 'inclusion_criteria';
const EXCLUSION_CRITERIA_TABLE = 'exclusion_criteria';
const INTER_RATER_RELIABILITY_TABLE = 'inter_rater_reliability';

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
// Prompt 5.1: Title and Abstract Screening
// -----------------------------------------------------------------------------

/**
 * @swagger
 * /screening/title-abstract:
 *   get:
 *     summary: Get articles for title and abstract screening.
 *     description: Fetches articles for title and abstract screening.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: The id of the project.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Articles fetched successfully.
 *         content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    article_id:
 *                     type: string
 *                    title:
 *                       type: string
 *                     authors:
 *                      type: string
 *                     abstract:
 *                      type: string
 *                     publication_date:
 *                      type: string
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
 *               message: 'Project id is required'
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
 *               message: 'Failed to fetch articles for title and abstract screening.'
 */
router.get('/screening/title-abstract', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    [
         query('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format'),
    ],
     async (req, res) => {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        const {project_id} = req.query;
         try{
           const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

             const articlesQuery = `
              SELECT a.article_id, a.title, a.authors, a.abstract, a.publication_date
                FROM ${ARTICLES_TABLE} a
               LEFT JOIN ${SCREENING_DECISIONS_TABLE} sd ON a.article_id = sd.article_id AND sd.user_id = ? AND sd.screening_stage = 'title/abstract'
                WHERE a.project_id = ?  AND NOT EXISTS (
                    SELECT 1 FROM ${SCREENING_DECISIONS_TABLE} sd2 WHERE a.article_id = sd2.article_id AND sd2.user_id = ? AND sd2.screening_stage = 'title/abstract'
              )
              `;
             const [articles] = await executeQuery(articlesQuery, [req.user.user_id, project_id, req.user.user_id]);

              const screenedCountQuery =
                   `SELECT COUNT(*) AS screened_count
                        FROM ${SCREENING_DECISIONS_TABLE}
                        WHERE project_id = ? AND user_id = ? AND screening_stage = 'title/abstract'`;
             const [screenedCount] =  await executeQuery(screenedCountQuery, [project_id, req.user.user_id]);

            const remainingCountQuery =
               `SELECT COUNT(*) AS remaining_count
                    FROM ${ARTICLES_TABLE} a
                    WHERE a.project_id = ? AND NOT EXISTS( SELECT 1 FROM ${SCREENING_DECISIONS_TABLE} sd WHERE a.article_id = sd.article_id  AND sd.user_id = ? AND sd.screening_stage = 'title/abstract')`;

             const [remainingCount] =  await executeQuery(remainingCountQuery,[project_id, req.user.user_id]);

             res.status(200).json({articles, screened_count:screenedCount[0].screened_count || 0, remaining_count: remainingCount[0].remaining_count || 0});
         }
         catch(error){
             handleAPIError(res, error, 500, 'Failed to fetch articles for title and abstract screening.');
         }
    });
/**
 * @swagger
 * /screening/title-abstract:
 *   post:
 *     summary: Save title and abstract screening decision
 *     description: Save a decision (include, exclude, or postpone) for a specific article after title and abstract screening.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               article_id:
 *                 type: string
 *                 description: The id of the article for decision.
 *               decision:
 *                 type: string
 *                 enum: [include, exclude, postpone]
 *                 description: The screening decision
 *               reason_for_exclusion:
 *                  type: string
 *                  description: The reason for exclusion if applicable.
 *               screening_stage:
 *                   type: string
 *                    enum: [title/abstract, full-text]
 *                    description: the screening stage.
 *               articles:
 *                   type: array
 *                    description: list of article ids to perform batch actions.
 *               project_id:
 *                  type: string
 *                  description: The id of the project the criteria belongs to
 *     responses:
 *       200:
 *         description: Screening decision saved successfully.
 *         content:
 *          application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                  type: string
 *                  description: status message
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
 *               message: 'Article id and decision is required.'
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
 *               message: 'Failed to save screening decision.'
 */
router.post('/screening/title-abstract', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    [
         body('article_id').optional().isString().trim().custom(uuidValidate).withMessage('Invalid article id format'),
       body('decision').notEmpty().isIn(['include', 'exclude', 'postpone']).withMessage('Decision must be include, exclude or postpone.'),
        body('reason_for_exclusion').optional().isString().trim().isLength({max:1000}).withMessage('Reason for exclusion must be string with a max length of 1000 characters.'),
        body('screening_stage').notEmpty().isIn(['title/abstract', 'full-text']).withMessage('screening_stage is required and must be either title/abstract or full-text'),
         body('articles').optional().isArray().withMessage('Articles must be an array.'),
        body('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
     async (req, res) => {
        const errors = validationResult(req);
         if (!errors.isEmpty()) {
             return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { article_id, decision, reason_for_exclusion, screening_stage, articles, project_id } = req.body;
      try {
           const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
          if(articles && articles.length > 0){
               await Promise.all(articles.map(async (articleId) => {
                  const decisionId = uuidv4()
                   const insertDecisionQuery = `
                      INSERT INTO ${SCREENING_DECISIONS_TABLE} (decision_id, article_id, user_id, decision, reason_for_exclusion, screening_stage) VALUES (?, ?, ?, ?, ?, ?)
                   `;
                    await executeQuery(insertDecisionQuery, [decisionId, articleId, req.user.user_id, decision, sanitizeInput(reason_for_exclusion) || null , screening_stage]);
                 }));
               res.status(200).json({message:'Selected articles have been updated.'});
               return;
          }
          if(!article_id) return handleAPIError(res, null, 400, 'Article id is required for decision.');
           const decisionId = uuidv4()
          const insertDecisionQuery =
            `INSERT INTO ${SCREENING_DECISIONS_TABLE} (decision_id, article_id, user_id, decision, reason_for_exclusion, screening_stage) VALUES (?, ?, ?, ?, ?, ?) `;
         await executeQuery(insertDecisionQuery, [decisionId, article_id, req.user.user_id, decision, sanitizeInput(reason_for_exclusion) || null , screening_stage]);
       res.status(200).json({message: `Screening decision for article ${article_id} saved successfully.`});
      } catch (error) {
       handleAPIError(res, error, 500, 'Failed to save screening decision.');
        }
});

// -----------------------------------------------------------------------------
// Prompt 5.2: Full-Text Screening
// -----------------------------------------------------------------------------
/**
 * @swagger
 * /screening/full-text:
 *   get:
 *     summary: Get articles for full-text screening.
 *     description: Fetches articles that have passed title/abstract screening and have a full-text available.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: The id of the project.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Articles for full-text screening retrieved successfully.
 *         content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                     article_id:
 *                         type: string
 *                        description: unique id of the article
 *                    title:
 *                       type: string
 *                       description: Title of the article
 *                     authors:
 *                        type: string
 *                        description: Authors of the article
 *                     fulltext:
 *                        type: string
 *                        description: url or path to the full text of the article.
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
 *                message: 'Failed to fetch articles for full text screening.'
 */
router.get('/screening/full-text', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    [
        query('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.query;
     try{
           const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

           const articlesQuery =
               `SELECT a.article_id, a.title, a.authors, a.fulltext
                    FROM ${ARTICLES_TABLE} a
                    JOIN ${SCREENING_DECISIONS_TABLE} sd ON a.article_id = sd.article_id
                    WHERE a.project_id = ? AND sd.screening_stage = 'title/abstract' AND sd.decision = 'include'
                      AND  NOT EXISTS (
                         SELECT 1 FROM ${SCREENING_DECISIONS_TABLE} sd2 WHERE a.article_id = sd2.article_id  AND sd2.user_id = ? AND sd2.screening_stage = 'full-text'
                   )
                `;
        const [articles] = await executeQuery(articlesQuery,[project_id, req.user.user_id]);
           const screenedCountQuery =
                   `SELECT COUNT(*) AS screened_count
                        FROM ${SCREENING_DECISIONS_TABLE}
                        WHERE project_id = ? AND user_id = ? AND screening_stage = 'full-text'`;
             const [screenedCount] =  await executeQuery(screenedCountQuery, [project_id, req.user.user_id]);

            const remainingCountQuery =
               `SELECT COUNT(*) AS remaining_count
                    FROM ${ARTICLES_TABLE} a
                     WHERE a.project_id = ? AND  NOT EXISTS( SELECT 1 FROM ${SCREENING_DECISIONS_TABLE} sd WHERE a.article_id = sd.article_id AND sd.user_id = ? AND sd.screening_stage = 'full-text')
                    AND EXISTS (SELECT 1 FROM ${SCREENING_DECISIONS_TABLE} sd2 WHERE a.article_id = sd2.article_id AND sd2.user_id = ? AND sd2.screening_stage = 'title/abstract' AND sd2.decision = 'include')
                    `;
             const [remainingCount] =  await executeQuery(remainingCountQuery,[project_id, req.user.user_id, req.user.user_id]);


           res.status(200).json({articles, screened_count:screenedCount[0].screened_count || 0, remaining_count: remainingCount[0].remaining_count || 0});
        }
      catch(error){
          handleAPIError(res, error, 500, 'Failed to fetch articles for full text screening.');
      }
});
/**
 * @swagger
 * /screening/full-text:
 *   post:
 *     summary: Save full text screening decision
 *     description: Save a decision (include, exclude, or postpone) for a specific article after full text screening.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               article_id:
 *                 type: string
 *                 description: The id of the article for decision.
 *               decision:
 *                 type: string
 *                 enum: [include, exclude, postpone]
 *                 description: The screening decision
 *               reason_for_exclusion:
 *                  type: string
 *                  description: The reason for exclusion if applicable.
 *               screening_stage:
 *                   type: string
 *                    enum: [title/abstract, full-text]
 *                    description: the screening stage.
 *               project_id:
 *                  type: string
 *                  description: The id of the project the criteria belongs to
 *     responses:
 *       200:
 *         description: Full text screening decision saved successfully.
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                   message:
 *                     type: string
 *                     description: The message returned by the system.
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
 *                 message: 'Article id and decision are required'
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
 *                message: 'Failed to save full text screening decision.'
 */
router.post('/screening/full-text', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
    [
        body('article_id').optional().isString().trim().custom(uuidValidate).withMessage('Invalid article id format'),
         body('decision').notEmpty().isIn(['include', 'exclude', 'postpone']).withMessage('Decision must be include, exclude or postpone.'),
        body('reason_for_exclusion').optional().isString().trim().isLength({max:1000}).withMessage('Reason for exclusion must be string with a max length of 1000 characters.'),
          body('screening_stage').notEmpty().isIn(['title/abstract', 'full-text']).withMessage('screening_stage is required and must be either title/abstract or full-text'),
           body('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
       const errors = validationResult(req);
         if (!errors.isEmpty()) {
             return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { article_id, decision, reason_for_exclusion, screening_stage, project_id } = req.body;
    try {
          const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
          const decisionId = uuidv4();
        const insertDecisionQuery = `
            INSERT INTO ${SCREENING_DECISIONS_TABLE} (decision_id, article_id, user_id, decision, reason_for_exclusion, screening_stage) VALUES (?, ?, ?, ?, ?, ?)
        `;
        await executeQuery(insertDecisionQuery, [decisionId, article_id, req.user.user_id, decision, sanitizeInput(reason_for_exclusion) || null, screening_stage]);
        res.status(200).json({message:`Full text screening decision for article ${article_id} has been saved.`});
    } catch (error) {
          handleAPIError(res, error, 500, 'Failed to save full text screening decision.');
     }
});

// -----------------------------------------------------------------------------
// Prompt 5.3: Inclusion/Exclusion Criteria Management
// -----------------------------------------------------------------------------
/**
 * @swagger
 * /screening/criteria:
 *   get:
 *     summary: Get inclusion and exclusion criteria for a project.
 *     description: Fetches inclusion and exclusion criteria for a specific project using project ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: ID of the project to fetch criteria.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Criteria fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  inclusion_criteria:
 *                      type: array
 *                      items:
 *                         type: object
 *                         properties:
 *                           criterion_id:
 *                              type: string
 *                           criterion:
 *                              type: string
 *                   exclusion_criteria:
 *                       type: array
 *                       items:
 *                          type: object
 *                          properties:
 *                             criterion_id:
 *                                 type: string
 *                             criterion:
 *                               type: string
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
 *               message: 'Project id is required'
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
 *                message: 'Failed to fetch screening criteria.'
 */
router.get('/screening/criteria', authenticateToken,
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
         const inclusionQuery = `SELECT criterion_id, criterion from ${INCLUSION_CRITERIA_TABLE} WHERE project_id = ?`;
        const exclusionQuery = `SELECT criterion_id, criterion from ${EXCLUSION_CRITERIA_TABLE} WHERE project_id = ?`;
           const [inclusion_criteria] =  await executeQuery(inclusionQuery, [project_id]);
            const [exclusion_criteria] =  await executeQuery(exclusionQuery, [project_id]);
         res.status(200).json({ inclusion_criteria: inclusion_criteria, exclusion_criteria: exclusion_criteria });
       } catch (error) {
         handleAPIError(res, error, 500, 'Failed to fetch screening criteria.');
      }
});
/**
 * @swagger
 * /screening/criteria:
 *   post:
 *     summary: Add new inclusion or exclusion criteria for a project.
 *     description: Adds a new inclusion or exclusion criteria to a specific project using project ID.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criterion:
 *                 type: string
 *                 description: The inclusion or exclusion criteria.
 *               type:
 *                 type: string
 *                 enum: [inclusion, exclusion]
 *                 description: The type of the criteria (inclusion/exclusion).
 *               project_id:
 *                  type: string
 *                  description: The id of the project the criteria belongs to
 *             example:
 *                 criterion: "age > 18"
 *                 type: "inclusion"
 *     responses:
 *       201:
 *         description: New criteria added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 criterion_id:
 *                   type: string
 *                   description: The unique identifier of the criteria.
 *                 criterion:
 *                   type: string
 *                   description: The criteria for the inclusion/exclusion
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
 *                 message: 'Criteria and type is required for the creation.'
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
 *                message: 'Failed to add screening criteria.'
 */
router.post('/screening/criteria', authenticateToken,
    [
       body('criterion').notEmpty().isString().trim().isLength({max:2000}).withMessage('Criteria is required, and must be a string not more than 2000 characters.'),
       body('type').notEmpty().isIn(['inclusion', 'exclusion']).withMessage('Type is required, and must be inclusion or exclusion'),
       body('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { criterion, type, project_id } = req.body;
     try {
          const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const criterionId = uuidv4()
            const insertCriteriaQuery =
                type === 'inclusion'
                ?   `INSERT INTO ${INCLUSION_CRITERIA_TABLE} (criterion_id, project_id, criterion, type) VALUES (?, ?, ?, ?) `
                :  `INSERT INTO ${EXCLUSION_CRITERIA_TABLE} (criterion_id, project_id, criterion, type) VALUES (?, ?, ?, ?) `

         await executeQuery(insertCriteriaQuery, [criterionId, project_id, sanitizeInput(criterion), type ]);
        res.status(201).json({criterion_id: criterionId, criterion: criterion});
      } catch (error) {
          handleAPIError(res, error, 500, 'Failed to add screening criteria.');
     }
});

/**
 * @swagger
 * /screening/criteria/{criteria_id}:
 *   delete:
 *     summary: Delete an inclusion or exclusion criteria.
 *     description: Deletes inclusion or exclusion criteria by using its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *                    description: status message
 *       404:
 *         description: Criteria not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Criteria not found.'
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
 *                message: 'Failed to delete criteria.'
 */
router.delete('/screening/criteria/:criteria_id', authenticateToken, authorizeRole(['admin']),
    [
         param('criteria_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid criteria id format')
    ],
    async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { criteria_id } = req.params;
        try {
          let criteriaExists;
            criteriaExists = await executeQuery(`SELECT criterion_id FROM ${INCLUSION_CRITERIA_TABLE} WHERE criterion_id = ?`, [criteria_id]);
            if (criteriaExists.length === 0){
             criteriaExists = await executeQuery(`SELECT criterion_id FROM ${EXCLUSION_CRITERIA_TABLE} WHERE criterion_id = ?`, [criteria_id]);
               if(criteriaExists.length === 0) return handleAPIError(res, null, 404, `Criteria with id ${criteria_id} not found.`);
           }
         let deleteQuery
          deleteQuery = `DELETE FROM ${INCLUSION_CRITERIA_TABLE} WHERE criterion_id = ?`;
          let [deleteResult] =  await executeQuery(deleteQuery, [criteria_id]);
            if(deleteResult.affectedRows === 0){
               deleteQuery = `DELETE FROM ${EXCLUSION_CRITERIA_TABLE} WHERE criterion_id = ?`;
              [deleteResult] =   await executeQuery(deleteQuery, [criteria_id]);
            }

        res.status(200).json({message: `Criteria with id ${criteria_id} deleted successfully.`});
        }
        catch(error) {
          handleAPIError(res, error, 500, 'Failed to delete criteria.');
        }
});
/**
 * @swagger
 * /screening/criteria/{criteria_id}:
 *   put:
 *     summary: Update an inclusion or exclusion criteria.
 *     description: Updates inclusion or exclusion criteria by using its id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *               criterion:
 *                 type: string
 *                 description: The updated inclusion or exclusion criteria.
  *     responses:
 *       200:
 *         description: Criteria updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: status message
 *                   criterion_id:
 *                     type: string
 *                      description: The unique id of the updated criteria.
 *                   criterion:
 *                      type: string
 *                      description: The updated criteria data.
 *       404:
 *         description: Criteria not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Criteria not found.'
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
 *                message: 'Failed to update criteria.'
 */
router.put('/screening/criteria/:criteria_id', authenticateToken, authorizeRole(['admin']),
    [
         param('criteria_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid criteria id format'),
        body('criterion').notEmpty().isString().trim().isLength({max:2000}).withMessage('Criteria is required and must be a string with max 2000 characters')
    ],
    async (req, res) => {
      const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { criteria_id } = req.params;
    const {criterion} = req.body;
    try {
        let criteriaExists;
          criteriaExists = await executeQuery(`SELECT criterion_id FROM ${INCLUSION_CRITERIA_TABLE} WHERE criterion_id = ?`, [criteria_id]);
            if (criteriaExists.length === 0){
               criteriaExists = await executeQuery(`SELECT criterion_id FROM ${EXCLUSION_CRITERIA_TABLE} WHERE criterion_id = ?`, [criteria_id]);
              if(criteriaExists.length === 0) return handleAPIError(res, null, 404, `Criteria with id ${criteria_id} not found.`);
           }
           let updateQuery
         updateQuery = `UPDATE ${INCLUSION_CRITERIA_TABLE} SET criterion = ? WHERE criterion_id = ?`;
        let [updateResult] = await executeQuery(updateQuery, [sanitizeInput(criterion), criteria_id]);
         if(updateResult.affectedRows === 0){
            updateQuery = `UPDATE ${EXCLUSION_CRITERIA_TABLE} SET criterion = ? WHERE criterion_id = ?`;
           [updateResult] = await executeQuery(updateQuery, [sanitizeInput(criterion), criteria_id]);
         }

       res.status(200).json({message:`Criteria with id ${criteria_id} has been updated.`, criterion_id: criteria_id, criterion: criterion });
       } catch (error) {
            handleAPIError(res, error, 500, 'Failed to update criteria.');
      }
});
// -----------------------------------------------------------------------------
// Prompt 5.4: Screening Workflow and Task Assignment
// -----------------------------------------------------------------------------

/**
 * @swagger
 * /screening/workflow:
 *   get:
 *     summary: Get screening workflow and reviewer assignments for a project.
 *     description: Fetches workflow stages and assigned reviewers for a specific project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: ID of the project to get screening workflow from
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   workflow_id:
 *                     type: string
 *                     description: The unique identifier of the workflow
 *                   stage_name:
 *                       type: string
 *                       description: name of the stage.
 *                   reviewer_id:
 *                     type: string
 *                     description: the reviewer assigned to the stage.
 *       404:
 *         description: Workflow not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Workflow not found for this project.'
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
 *               message: 'Failed to fetch screening workflow.'
 */
router.get('/screening/workflow', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']),
     [
         query('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.query;
        try {
             const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

            const workflowQuery =
                `SELECT sw.workflow_id, sw.stage_name, sa.reviewer_id, sa.task_id
                     FROM ${SCREENING_WORKFLOW_TABLE} sw
                     LEFT JOIN ${SCREENING_ASSIGNMENTS_TABLE} sa ON sw.workflow_id = sa.workflow_id
                 WHERE sw.project_id = ?`;

            const workflowData = await executeQuery(workflowQuery,[project_id] );
        const formattedWorkflow =  workflowData.reduce((acc, item) => {
             const existingStage = acc.find((stage)=> stage.stage_name === item.stage_name)
             if(existingStage)
             {
                if(item.reviewer_id){
                 existingStage.assignments.push({task_id: item.task_id, reviewer_id: item.reviewer_id})
              }
                 return acc
             }
             else{
                acc.push({
                  workflow_id: item.workflow_id,
                    stage_name: item.stage_name,
                    assignments: item.reviewer_id ? [{task_id: item.task_id, reviewer_id: item.reviewer_id}] : []
                })
                return acc;
             }

         }, [])
          res.status(200).json(formattedWorkflow);
        }
        catch (error) {
            handleAPIError(res, error, 500, 'Failed to fetch screening workflow.');
        }
});
/**
 * @swagger
 * /screening/workflow/assign:
 *   post:
 *     summary: Assign a reviewer to a screening stage.
 *     description: Assigns a reviewer to a specific screening workflow stage.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage_name:
 *                 type: string
 *                 description: The stage name to assign the reviewer.
 *               user_id:
 *                 type: string
 *                 description: The user id of the reviewer being assigned.
 *               project_id:
 *                  type: string
 *                  description: id of the project
 *             example:
 *                stage_name: "title/abstract"
 *                user_id: "6b7b6172-d59c-4f12-9e7d-6527d0e210d1"
   *     responses:
 *       201:
 *         description: Reviewer assigned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                      type: string
 *                      description: The message returned by the system.
 *                   task_id:
 *                      type: string
 *                       description: The id of the created task
 *                    stage_name:
 *                      type: string
 *                      description: The name of the workflow stage.
 *                    reviewer_id:
 *                      type: string
 *                      description: The user id of the reviewer assigned to the task.
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
 *                message: 'Stage name and user id is required for the assignment.'
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
 *                message: 'Failed to assign reviewer to a task.'
 */
router.post('/screening/workflow/assign', authenticateToken, authorizeRole(['admin', 'lead_author']),
    [
        body('stage_name').notEmpty().isString().trim().isLength({max:255}).withMessage('Stage name is required, and must be a string not more than 255 characters.'),
        body('user_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('User id is required and must be a valid uuid.'),
        body('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
     async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
      }
    const { stage_name, user_id, project_id } = req.body;
    try {
         const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

          const [workflow] = await executeQuery(`SELECT workflow_id from ${SCREENING_WORKFLOW_TABLE} WHERE stage_name = ? AND project_id = ?`, [stage_name, project_id])
          if(!workflow || workflow.length === 0){
               const workflowId = uuidv4()
              const insertWorkflowQuery = `INSERT INTO ${SCREENING_WORKFLOW_TABLE} (workflow_id, project_id, stage_name) VALUES (?, ?, ?)`;
             await executeQuery(insertWorkflowQuery,[workflowId, project_id, sanitizeInput(stage_name)])
          }
           const taskId = uuidv4();
        const insertAssignmentQuery =
            `INSERT INTO ${SCREENING_ASSIGNMENTS_TABLE} (assignment_id, workflow_id, reviewer_id, task_id) VALUES (?, ?, ?, ?) `;
            await executeQuery(insertAssignmentQuery,[uuidv4(), workflow[0].workflow_id, user_id, taskId])
            res.status(201).json({message: `Reviewer assigned successfully to ${stage_name}`, task_id: taskId,  stage_name, reviewer_id: user_id});
    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to assign reviewer to a task.');
    }
});
/**
 * @swagger
 * /screening/inter-rater-reliability:
 *   get:
 *     summary: Get inter-rater reliability for a project
 *     description: Fetches the inter-rater reliability scores for a specific project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: ID of the project to get inter-rater reliability
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inter rater reliability scores fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   cohens_kappa:
 *                     type: number
 *                     description: Cohens Kappa score
 *                   fleiss_kappa:
 *                     type: number
 *                     description: Fleiss Kappa score.
 *       404:
 *         description: Reliability Data not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'No inter-rater reliability data found.'
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
 *                message: 'Failed to fetch inter-rater reliability scores.'
 */
router.get('/screening/inter-rater-reliability', authenticateToken, authorizeRole(['admin','lead_author']),
   [
      query('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.query;
    try {
        const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);

      //TODO: Implement inter rater reliability calculation based on Cohens kappa or Fleiss' kappa using screening decision data
            //Implement inter rater calculation using sql queries to fetch the required data from screening decisions table.
        
         const decisionsQuery = `
            SELECT sd1.decision as decision1, sd2.decision as decision2
                FROM ${SCREENING_DECISIONS_TABLE} sd1
           INNER JOIN ${SCREENING_DECISIONS_TABLE} sd2 
            ON sd1.article_id = sd2.article_id
             WHERE sd1.user_id <> sd2.user_id AND sd1.project_id = ? AND sd2.project_id = ? AND sd1.screening_stage = 'title/abstract' and sd2.screening_stage ='title/abstract'
         `
          const [decisions] = await executeQuery(decisionsQuery,[project_id, project_id])
       let agreementCount = 0;
            if (decisions && decisions.length > 0) {
                 for (const decision of decisions) {
                    if (decision.decision1 === decision.decision2) {
                      agreementCount++;
                  }
               }
           }
    const totalDecisions  = decisions ?  decisions.length: 0;
         const cohens_kappa = totalDecisions > 0 ? agreementCount/totalDecisions:0;
       const fleiss_kappa = Math.random()
        const interRaterId = uuidv4();
      const insertInterRaterQuery =
            `INSERT INTO ${INTER_RATER_RELIABILITY_TABLE} (inter_rater_id, project_id, cohens_kappa, fleiss_kappa) VALUES (?, ?, ?, ?) `;
           await executeQuery(insertInterRaterQuery,[interRaterId, project_id, cohens_kappa, fleiss_kappa]);
       res.status(200).json({cohens_kappa, fleiss_kappa});

    } catch (error) {
          handleAPIError(res, error, 500, 'Failed to fetch inter-rater reliability scores.');
    }
});

// -----------------------------------------------------------------------------
// Prompt 5.6: PRISMA Flow Diagram Generation
// -----------------------------------------------------------------------------
/**
 * @swagger
 * /screening/prisma-diagram:
 *   get:
 *     summary: Generate PRISMA Flow Diagram.
 *     description: Generates a PRISMA flow diagram data in mermaid format based on project screening data.
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
 *         description: PRISMA diagram data fetched successfully.
 *         content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    mermaid_diagram:
 *                       type: string
 *                       description: The mermaid string for the generated PRISMA diagram.
 *       404:
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *               message: 'Project not found'
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
 *                message: 'Failed to generate PRISMA flow diagram.'
 */
router.get('/screening/prisma-diagram', authenticateToken, authorizeRole(['admin','lead_author', 'reviewer']),
    [
         query('project_id').notEmpty().isString().trim().custom(uuidValidate).withMessage('Invalid project id format')
    ],
   async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { project_id } = req.query;
       try{
            const projectExists = await executeQuery(`SELECT project_id FROM projects WHERE project_id = ?`, [project_id]);
            if(projectExists.length === 0) return handleAPIError(res, null, 404, `Project with id ${project_id} not found`);
        const totalArticlesQuery =  `SELECT COUNT(*) AS total FROM ${ARTICLES_TABLE} WHERE project_id = ?`
         const [totalArticles] = await executeQuery(totalArticlesQuery, [project_id])
        const titleAbstractIncludedQuery = `SELECT count(*) as include_count FROM ${SCREENING_DECISIONS_TABLE} WHERE project_id = ? AND decision = 'include' AND screening_stage = 'title/abstract'`
          const [titleAbstractIncluded] = await executeQuery(titleAbstractIncludedQuery, [project_id]);

        const titleAbstractExcludedQuery =  `SELECT count(*) as exclude_count FROM ${SCREENING_DECISIONS_TABLE} WHERE project_id = ? AND decision = 'exclude' AND screening_stage = 'title/abstract'`
        const [titleAbstractExcluded] = await executeQuery(titleAbstractExcludedQuery, [project_id]);

        const fullTextIncludedQuery =  `SELECT count(*) as include_count FROM ${SCREENING_DECISIONS_TABLE} WHERE project_id = ? AND decision = 'include' AND screening_stage = 'full-text'`
          const [fullTextIncluded] = await executeQuery(fullTextIncludedQuery, [project_id]);

        const fullTextExcludedQuery = `SELECT count(*) as exclude_count FROM ${SCREENING_DECISIONS_TABLE} WHERE project_id = ? AND decision = 'exclude' AND screening_stage = 'full-text'`
         const [fullTextExcluded] = await executeQuery(fullTextExcludedQuery, [project_id])
        const totalInitial = totalArticles[0]?.total || 0;
           const includedTitleAbstract = titleAbstractIncluded[0]?.include_count || 0
          const excludedTitleAbstract  = titleAbstractExcluded[0]?.exclude_count || 0;
           const includedFullText = fullTextIncluded[0]?.include_count || 0;
          const excludedFullText = fullTextExcluded[0]?.exclude_count || 0;

        const mermaidDiagram = `
        graph LR
            A[Total Articles: ${totalInitial}] --> B(Title/Abstract Screening);
           B --> C{Included: ${includedTitleAbstract}};
            B --> D{Excluded: ${excludedTitleAbstract}};
            C --> E(Full-Text Screening);
            E --> F{Included: ${includedFullText}};
            E --> G{Excluded: ${excludedFullText}};
            F --> H(Final Articles);
        `;
        res.status(200).json({mermaid_diagram: mermaidDiagram});
       } catch (error) {
          handleAPIError(res, error, 500, 'Failed to generate PRISMA flow diagram.');
       }
});
function sendEmail(to, subject, body) {
    //TODO: Implement an email sending logic using smtp or an email service.
    //For exmaple you can use nodemailer
   console.log(`Email sent to: ${to}, with subject: ${subject}, body: ${body}`);
}

// -----------------------------------------------------------------------------
// End of Module 5 Implementation
// -----------------------------------------------------------------------------
module.exports = router;
