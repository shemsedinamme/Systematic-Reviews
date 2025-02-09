//ReportRoutes.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('./database');
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const Database = require('./database');
const {generatePDF, generateWord, generateExcel, generateCSV, generateXML, generateTableData, generateFigures} = require('./reportUtils');
const router = express.Router();
const db = new Database(pool);

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get a list of reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                   properties:
 *                      report_id:
 *                         type: string
 *                         description: id of the report
 *                      project_id:
 *                         type: string
 *                         description: id of the project
 *                       template_id:
 *                         type: string
 *                         description: id of the used report template
 *                       metadata:
 *                         type: object
 *                         description: metadata of the report
 *       500:
 *          description: Internal server error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *              example:
 *                message: 'Failed to fetch reports.'
 */
router.get('/reports', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
    try {
         const reports = await db.getAllRecord('report_metadata',()=>({}));
        res.status(200).json(reports);
    } catch (error) {
         res.status(500).json({ message: `Failed to fetch reports. ${error.message}` });
    }
});

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Create a new report with metadata.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               project_id:
 *                  type: string
 *                  description: The project ID to which this report will be assigned.
 *               template_id:
 *                  type: string
 *                   description: The id of the report template.
 *               metadata:
 *                  type: object
 *                  description: report meta data.
 *             example:
 *                project_id: "uuid"
 *                template_id: "uuid"
 *                metadata : {}
 *     responses:
 *       201:
 *         description: Report created successfully.
 *         content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    report_id:
 *                       type: string
 *                       description: The id of the created report.
 *                    project_id:
 *                       type: string
 *                       description: The id of the project.
 *                    template_id:
 *                       type: string
 *                       description: The id of the template used for creating the report.
 *                   metadata:
 *                      type: object
 *                      description: Metadata of the report.
 *       400:
 *          description: Bad request, missing required input fields.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Missing required fields.'
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
 *                message: 'Failed to create report.'
 */
router.post('/reports', authenticateToken, authorizeRole(['admin', 'lead_author']), async (req, res) => {
    const { project_id, template_id, metadata } = req.body;
      if(!project_id || !template_id || !metadata) return res.status(400).json({message: 'Missing required fields.'})
        const newReport = {
         report_id: uuidv4(),
          project_id,
          template_id,
           metadata
        };
    try {
         const result = await db.insertRecord('report_metadata', newReport, ['project_id', 'template_id', 'metadata'])
         res.status(201).json(result);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ message: `Failed to create report. ${error.message}` });
    }
});

/**
 * @swagger
 * /reports/{report_id}:
 *   get:
 *     summary: Get a specific report with metadata.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to fetch.
 *         schema:
 *           type: string
  *     responses:
 *       200:
 *         description: Report fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   report_id:
 *                      type: string
 *                      description: The id of the report
 *                   project_id:
 *                      type: string
 *                      description: The id of the project associated with the report
 *                   template_id:
 *                      type: string
 *                      description: The id of the report template
 *                   metadata:
 *                     type: object
 *                      description: The metadata of the report
 *       404:
 *         description: Report not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Report not found.'
 *       500:
 *          description: Internal server error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *              example:
 *                message: 'Failed to fetch report details.'
 */
router.get('/reports/:report_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
  const { report_id } = req.params;
  try {
      const report = await db.getRecordById('report_metadata', report_id, 'report_id', () => ({}));
      if(!report) return res.status(404).json({message: 'Report not found.'});
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: `Failed to fetch report details. ${error.message}` });
  }
});
/**
 * @swagger
 * /reports/{report_id}:
 *   put:
 *     summary: Update metadata of a specific report.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to be updated
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metadata:
 *                 type: object
 *                 description: report metadata object.
 *             example:
 *                  metadata : {}
 *     responses:
 *       200:
 *         description: Report metadata updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    report_id:
 *                      type: string
 *                      description: The id of the report
 *                   project_id:
 *                      type: string
 *                      description: The id of the project
 *                   template_id:
 *                      type: string
 *                      description: The id of the template used for creating report.
 *                   metadata:
 *                      type: object
 *                      description: The updated metadata object.
 *       400:
 *          description: Bad request, metadata is required.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Metadata is required.'
 *       404:
 *         description: Report not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Report not found.'
 *       500:
 *          description: Internal server error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *              example:
 *                message: 'Failed to update report metadata.'
 */
router.put('/reports/:report_id', authenticateToken, authorizeRole(['admin', 'lead_author']), async (req, res) => {
    const { report_id } = req.params;
    const { metadata } = req.body;
    if (!metadata) {
      return res.status(400).json({ message: 'Metadata is required.' });
    }
    try {
       const data =  await db.updateRecord('report_metadata', { metadata }, report_id, 'report_id');
        if (!data) return res.status(404).json({ message: 'Report not found.' });
       const updatedReport = await db.getRecordById('report_metadata',report_id,'report_id', ()=>({}))
       res.status(200).json(updatedReport);
     } catch (error) {
       console.error("report updating error", error)
        res.status(500).json({ message: `Failed to update report metadata. ${error.message}` });
     }
});

/**
 * @swagger
 * /reports/{report_id}:
 *   delete:
 *     summary: Delete a specific report.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to delete.
 *         schema:
 *           type: string
  *     responses:
 *       200:
 *         description: Report deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *               message: "Report deleted successfully."
 *       404:
 *         description: Report not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Report not found.'
 *       500:
 *          description: Internal server error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *              example:
 *                message: 'Failed to delete the report.'
 */
router.delete('/reports/:report_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { report_id } = req.params;
    try {
        const report = await db.deleteRecord('report_metadata',report_id, 'report_id');
        if(!report) return  res.status(404).json({ message: 'Report not found.' });
       res.status(200).json({ message: 'Report deleted successfully.' });
   } catch (error) {
       console.error("report deletion error", error);
     res.status(500).json({ message: `Failed to delete the report. ${error.message}` });
  }
});

/**
 * @swagger
 * /reports/templates:
 *   get:
 *     summary: Get a list of report templates.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                   type: object
 *                   properties:
 *                       template_id:
 *                          type: string
 *                          description: ID of the report template.
 *                       template_name:
 *                         type: string
 *                         description: name of the template.
 *                       template_type:
 *                         type: string
 *                         description: report template type such as PRISMA etc.
 *                       template_structure:
 *                           type: object
 *                           description: Template structure with JSON object.
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
 *                message: 'Failed to fetch report templates.'
 */
router.get('/reports/templates', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
    try {
      const templates = await db.getAllRecord('report_templates', () => ({}));
        res.status(200).json(templates);
    } catch (error) {
         res.status(500).json({ message: `Failed to fetch report templates. ${error.message}` });
    }
});

/**
 * @swagger
 * /reports/templates:
 *   post:
 *     summary: Create a new report template.
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
 *                 description: Name of the template.
 *               template_type:
 *                 type: string
 *                 description: type of the template (e.g. Prisma, other etc)
 *               template_structure:
 *                   type: object
 *                   description: template structure with HTML or JSON object.
 *             example:
 *                template_name: "Prisma Template"
 *                template_type: "Prisma"
 *                template_structure : {}
 *     responses:
 *       201:
 *         description: Template created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    template_id:
 *                      type: string
 *                      description: The id of created template.
 *                   template_name:
 *                      type: string
 *                      description: The name of the template
 *                    template_type:
 *                      type: string
 *                      description: The template type
 *                   template_structure:
 *                      type: object
 *                      description: The report template structure (e.g. JSON or HTML)
 *       400:
 *          description: Bad request, missing required input fields.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Missing required fields.'
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
 *                message: 'Failed to create report template.'
 */
router.post('/reports/templates', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { template_name, template_type, template_structure } = req.body;
     if (!template_name || !template_type || !template_structure) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
      const newTemplate = {
        template_id: uuidv4(),
        template_name,
        template_type,
        template_structure,
      };
    try {
      const response = await db.insertRecord('report_templates', newTemplate, ['template_name', 'template_type', 'template_structure'] )
        res.status(201).json(response);
     } catch (error) {
      console.error('Error creating report template:', error);
         res.status(500).json({ message: `Failed to create report template. ${error.message}` });
    }
});
/**
 * @swagger
 * /reports/templates/{template_id}:
 *   get:
 *     summary: Get a specific report template.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the report template.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    template_id:
 *                      type: string
 *                      description: The id of the template
 *                   template_name:
 *                      type: string
 *                       description: Name of the report template.
 *                   template_type:
 *                      type: string
 *                       description: The template type (e.g., PRISMA).
 *                   template_structure:
 *                      type: object
 *                      description: The structure of the report template in JSON or HTML format.
 *       404:
 *         description: Template not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Template not found.'
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
 *                message: 'Failed to fetch report template details.'
 */
router.get('/reports/templates/:template_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
    const { template_id } = req.params;
    try {
        const template = await db.getRecordById('report_templates', template_id, 'template_id', () => ({}));
         if(!template) return res.status(404).json({ message: 'Template not found.' });
        res.status(200).json(template);
    } catch (error) {
       res.status(500).json({ message: `Failed to fetch report template details. ${error.message}` });
    }
});

/**
 * @swagger
 * /reports/templates/{template_id}:
 *   put:
 *     summary: Update a report template.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the template to update.
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
 *                 description: Name of the template.
 *               template_type:
 *                 type: string
 *                  description: Template type, e.g., PRISMA
 *               template_structure:
 *                  type: object
 *                   description: template structure object using JSON format.
 *             example:
 *                 template_name: "Updated Prisma Template"
 *                 template_type: "Prisma"
 *                 template_structure: {}
 *     responses:
 *       200:
 *         description: Template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    template_id:
 *                      type: string
 *                      description: The id of the template
 *                    template_name:
 *                      type: string
 *                      description: The name of the template
 *                    template_type:
 *                      type: string
 *                       description: The type of the template.
 *                    template_structure:
 *                       type: object
 *                       description: Template structure in JSON format
 *       400:
 *          description: Bad request, missing required input fields
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Missing required fields.'
 *       404:
 *         description: Template not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
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
 *                message: 'Failed to update report template.'
 */
router.put('/reports/templates/:template_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { template_id } = req.params;
    const { template_name, template_type, template_structure } = req.body;
    if (!template_name  || !template_type || !template_structure) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
         const data = await db.updateRecord('report_templates',{ template_name, template_type, template_structure }, template_id, 'template_id');
          if(!data) return  res.status(404).json({ message: 'Template not found.' });
           const updatedTemplate = await db.getRecordById('report_templates',template_id,'template_id',()=>({}))
         res.status(200).json(updatedTemplate);

    } catch (error) {
      console.error('Error updating report template:', error);
      res.status(500).json({ message: `Failed to update report template. ${error.message}` });
    }
});
/**
 * @swagger
 * /reports/templates/{template_id}:
 *   delete:
 *     summary: Delete a report template.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the report template to delete.
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
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *               message: "Template deleted successfully."
 *       404:
 *         description: Template not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
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
 *                message: 'Failed to delete template.'
 */
router.delete('/reports/templates/:template_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { template_id } = req.params;
    try {
       const template =  await db.deleteRecord('report_templates',template_id,'template_id')
         if(!template) return res.status(404).json({message:'Template not found'})
        res.status(200).json({ message: 'Template deleted successfully.' });
    } catch (error) {
      console.error('Error deleting report template:', error);
        res.status(500).json({ message: `Failed to delete template. ${error.message}` });
    }
});
/**
 * @swagger
 * /reports/{report_id}/generate-content:
 *   post:
 *     summary: Generates report content.
 *     description: Fetches data and generates a report content with narrative summaries, tables, and figures.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to fetch.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report content generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    narrative:
 *                       type: string
 *                       description: Summary of findings.
 *                   tableData:
 *                       type: object
 *                       description:  JSON data for tables
 *                   figures:
 *                       type: array
 *                       description: list of image or plotted object data
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
 *                message: 'Failed to generate report content.'
 */
router.post('/reports/:report_id/generate-content', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
  const { report_id } = req.params;
    try {
       // Implement logic to fetch data and generate content. Place holder implementations for now
        const narrative = `Narrative summary of report for id: ${report_id}`; //  Implement text summarization logic here
         const tableData =  {columns : ['col1','col2'], rows:[{},{}]}; // Implement aggregation logic here
          const figures = [{ chartType: 'bar', data:[{},{}],options:{}}];  // Implement charting logic here
        res.status(200).json({ narrative, tableData, figures });
    } catch (error) {
      console.error('Error generating report content:', error);
      res.status(500).json({ message: `Failed to generate report content. ${error.message}` });
   }
});


/**
 * @swagger
 * /manuscripts:
 *   get:
 *     summary: Get a list of manuscripts.
 *     security:
 *       - bearerAuth: []
  *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: ID of the project to get manuscripts.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manuscripts fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    manuscript_id:
 *                       type: string
 *                       description: The ID of manuscript.
 *                    project_id:
 *                       type: string
 *                       description: The ID of the project.
 *                    template_id:
 *                       type: string
 *                      description: The ID of the manuscript template.
 *                   content:
 *                       type: string
 *                      description: The content of the manuscript (HTML or text).
 *                  created_at:
 *                      type: string
 *                      format: date-time
 *                      description: Date and time of the creation
 *                  updated_at:
 *                    type: string
 *                      format: date-time
 *                      description: Date and time of the updation.
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
 *                message: 'Failed to fetch manuscripts.'
 */
router.get('/manuscripts', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
      const { project_id } = req.query;
    if (!project_id) {
       return res.status(400).json({message: 'Project Id is required'});
      }
    try {
        const manuscripts = await db.getAllRecord('manuscripts', () => ({}));
        res.status(200).json(manuscripts);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch manuscripts. ${error.message}` });
    }
});

/**
 * @swagger
 * /manuscripts:
 *   post:
 *     summary: Creates a new manuscript.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               project_id:
 *                 type: string
 *                 description: The id of the project.
 *               template_id:
 *                 type: string
 *                 description: The id of the template.
 *               content:
 *                  type: string
 *                  description: manuscript content.
 *             example:
 *                project_id : "uuid"
 *                template_id : "uuid"
 *                content: "manuscript content"
 *     responses:
 *       201:
 *         description: Created a new manuscript successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    manuscript_id:
 *                       type: string
 *                       description: The id of the created manuscript.
 *                    project_id:
 *                       type: string
 *                       description: The project ID.
 *                    template_id:
 *                        type: string
 *                        description: The ID of the manuscript template.
 *                   content:
 *                      type: string
 *                       description: The content of the manuscript (HTML or text).
 *       400:
 *          description: Bad request, missing required input fields
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Missing required fields.'
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
 *                message: 'Failed to create a new manuscript.'
 */
router.post('/manuscripts', authenticateToken, authorizeRole(['admin', 'lead_author']), async (req, res) => {
  const { project_id, template_id, content } = req.body;
   if (!project_id || !template_id) {
      return res.status(400).json({ message: 'Missing required fields.' });
   }
   const newManuscript = {
        manuscript_id: uuidv4(),
        project_id,
        template_id,
        content,
       created_at: new Date(),
       updated_at: new Date()

   };
    try {
         const response = await db.insertRecord('manuscripts', newManuscript, ['project_id', 'template_id', 'content']);
        res.status(201).json(response);
    } catch (error) {
        console.error('Error creating a new manuscript:', error);
        res.status(500).json({ message: `Failed to create a new manuscript. ${error.message}` });
    }
});

/**
 * @swagger
 * /manuscripts/{manuscript_id}:
 *   get:
 *     summary: Gets a specific manuscript with all data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manuscript_id
 *         required: true
 *         description: ID of the manuscript to fetch.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manuscript fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    manuscript_id:
 *                       type: string
 *                       description: The ID of manuscript.
 *                    project_id:
 *                       type: string
 *                       description: The ID of the project.
 *                    template_id:
 *                       type: string
 *                      description: The ID of the manuscript template.
 *                   content:
 *                      type: string
 *                       description: The content of the manuscript (HTML or text).
 *                  created_at:
 *                      type: string
 *                      format: date-time
 *                      description: Date and time of the creation
 *                  updated_at:
 *                    type: string
 *                      format: date-time
 *                      description: Date and time of the updation.
 *       404:
 *         description: Manuscript not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Manuscript not found.'
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
 *                message: 'Failed to fetch manuscript details.'
 */
router.get('/manuscripts/:manuscript_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
    const { manuscript_id } = req.params;
    try {
         const manuscript = await db.getRecordById('manuscripts', manuscript_id, 'manuscript_id', () => ({}));
         if(!manuscript) return res.status(404).json({message: 'Manuscript not found.'});
        res.status(200).json(manuscript);
    } catch (error) {
        console.error('Error fetching manuscript details:', error);
        res.status(500).json({ message: `Failed to fetch manuscript details. ${error.message}` });
    }
});
/**
 * @swagger
 * /manuscripts/{manuscript_id}:
 *   put:
 *     summary: Update a manuscript with the new details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manuscript_id
 *         required: true
 *         description: ID of the manuscript to update.
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
 *                 description: updated content.
 *             example:
 *                content : "updated manuscript content goes here"
 *     responses:
 *       200:
 *         description: Manuscript updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
  *                    manuscript_id:
 *                      type: string
 *                      description: The ID of the manuscript.
 *                    project_id:
 *                      type: string
 *                      description: The ID of the project.
 *                    template_id:
 *                       type: string
 *                      description: The ID of the template of manuscript
 *                   content:
 *                      type: string
 *                       description: The content of the manuscript.
 *                  created_at:
 *                      type: string
 *                      format: date-time
 *                      description: The creation timestamp of the manuscript.
 *                  updated_at:
 *                    type: string
 *                      format: date-time
 *                      description: updated time stamp for the manuscript.
 *       400:
 *          description: Bad request, missing required input fields.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Manuscript content  is required.'
 *       404:
 *         description: Manuscript not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Manuscript not found.'
 *       500:
 *          description: Internal server error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *              example:
 *                message: 'Failed to update manuscript.'
 */
router.put('/manuscripts/:manuscript_id', authenticateToken, authorizeRole(['admin', 'lead_author']), async (req, res) => {
  const { manuscript_id } = req.params;
  const { content } = req.body;
  if (!content) {
     return res.status(400).json({ message: 'Manuscript content  is required.' });
   }
   try {
         const updateResponse = await db.updateRecord('manuscripts', { content, updated_at:new Date() }, manuscript_id, 'manuscript_id');
        if(!updateResponse) return res.status(404).json({message: 'Manuscript not found'});
         const updatedManuscript = await db.getRecordById('manuscripts', manuscript_id, 'manuscript_id', () => ({}));
       res.status(200).json(updatedManuscript);
     } catch (error) {
       console.error("manuscript update error",error);
        res.status(500).json({ message: `Failed to update manuscript. ${error.message}` });
    }
});
/**
 * @swagger
 * /manuscripts/{manuscript_id}:
 *   delete:
 *     summary: Delete a manuscript.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manuscript_id
 *         required: true
 *         description: ID of the manuscript to be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manuscript deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *                message: "Manuscript deleted successfully."
 *       404:
 *         description: Manuscript not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Manuscript not found.'
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
 *                message: 'Failed to delete manuscript.'
 */
router.delete('/manuscripts/:manuscript_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { manuscript_id } = req.params;
   try {
        const response = await db.deleteRecord('manuscripts', manuscript_id, 'manuscript_id');
       if(!response) return res.status(404).json({message: 'Manuscript not found'})
        res.status(200).json({ message: 'Manuscript deleted successfully.' });
    } catch (error) {
        console.error('Error deleting manuscript:', error);
        res.status(500).json({ message: `Failed to delete manuscript. ${error.message}` });
    }
});
/**
 * @swagger
 * /manuscripts/templates:
 *   get:
 *     summary: List all available manuscript templates.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    template_id:
 *                      type: string
 *                      description: The id of the template
 *                   template_name:
 *                       type: string
 *                       description: The name of the manuscript template
 *                   template_structure:
 *                     type: string
 *                      description: The template structure object in string or json.
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
 *                message: 'Failed to fetch manuscript templates.'
 */
router.get('/manuscripts/templates', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
   try {
        const templates = await db.getAllRecord('manuscript_templates',()=>({}));
        res.status(200).json(templates);
    } catch (error) {
         res.status(500).json({ message: `Failed to fetch manuscript templates. ${error.message}` });
    }
});
/**
 * @swagger
 * /manuscripts/templates:
 *   post:
 *     summary: Create a new manuscript template.
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
 *                  type: string
 *                  description: The name of the template.
 *               template_structure:
 *                  type: object
 *                  description: The template structure
 *             example:
 *                template_name : "template1"
 *                template_structure : {}
 *     responses:
 *       201:
 *         description: Created a new manuscript template successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    template_id:
 *                       type: string
 *                       description: The unique identifier of the template.
 *                   template_name:
 *                       type: string
 *                       description: The name of the template
 *                   template_structure:
 *                      type: object
 *                       description: the structure of the template
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
 *                message: 'Template name and structure required.'
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
 *                message: 'Failed to create a new manuscript template.'
 */
router.post('/manuscripts/templates', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { template_name, template_structure } = req.body;
     if (!template_name || !template_structure ) {
         return res.status(400).json({ message: 'Template name and structure required.' });
      }
      const newTemplate = {
         template_id: uuidv4(),
          template_name,
           template_structure,
      };
    try {
        const data = await db.insertRecord('manuscript_templates', newTemplate, ['template_name', 'template_structure'])
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating a new manuscript template:', error);
        res.status(500).json({ message: `Failed to create a new manuscript template. ${error.message}` });
    }
});
/**
 * @swagger
 * /manuscripts/templates/{template_id}:
 *   get:
 *     summary: Get details of a specific manuscript template.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the template to fetch.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    template_id:
 *                       type: string
 *                       description: id of the template
 *                   template_name:
 *                      type: string
 *                       description: name of the manuscript template
 *                   template_structure:
 *                       type: object
 *                      description: Structure of the manuscript template
 *       404:
 *         description: Template not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
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
 *                message: 'Failed to fetch manuscript template details.'
 */
router.get('/manuscripts/templates/:template_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
  const { template_id } = req.params;
   try {
      const template = await db.getRecordById('manuscript_templates', template_id, 'template_id',()=>({}));
        if(!template) return res.status(404).json({message:'Template not found.'});
      res.status(200).json(template);
    } catch (error) {
      console.error('Error fetching manuscript template details:', error);
       res.status(500).json({ message: `Failed to fetch manuscript template details. ${error.message}` });
    }
});

/**
 * @swagger
 * /manuscripts/templates/{template_id}:
 *   put:
 *     summary: Update a specific manuscript template
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the template to update.
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
 *                  type: string
 *                 description: the name of the template
 *               template_structure:
 *                  type: object
 *                  description: the template structure with JSON or string format.
 *             example:
 *                template_name : "template1"
 *                template_structure : {}
 *     responses:
 *       200:
 *         description: Manuscript Template updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    template_id:
 *                      type: string
 *                      description: The unique identifier for the template.
 *                   template_name:
 *                      type: string
 *                      description: The name of the template
 *                   template_structure:
 *                       type: object
 *                        description: the structure of template.
 *       400:
 *          description: Bad request, invalid input.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Template name and structure required.'
 *       404:
 *         description: Template not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Template not found.'
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
 *                message: 'Failed to update the manuscript template.'
 */
router.put('/manuscripts/templates/:template_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { template_id } = req.params;
    const { template_name, template_structure } = req.body;
    if( !template_name || !template_structure) return res.status(400).json({message: 'Template name and structure required.'});
    try {
         const response =  await db.updateRecord('manuscript_templates',{template_name, template_structure}, template_id, 'template_id');
        if(!response) return  res.status(404).json({message: 'Template not found.'});
        const updatedTemplate = await db.getRecordById('manuscript_templates', template_id, 'template_id',()=>({}));
        res.status(200).json(updatedTemplate);

    } catch (error) {
        console.error('Error updating the manuscript template:', error);
        res.status(500).json({ message: `Failed to update the manuscript template. ${error.message}` });
    }
});
/**
 * @swagger
 * /manuscripts/templates/{template_id}:
 *   delete:
 *     summary: Delete a specific manuscript template.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the manuscript template to be deleted.
 *         schema:
 *           type: string
  *     responses:
 *       200:
 *         description: Manuscript Template deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *               message: "Template deleted successfully."
 *       404:
 *         description: Template not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Template not found.'
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
 *                message: 'Failed to delete the manuscript template.'
 */
router.delete('/manuscripts/templates/:template_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { template_id } = req.params;
      try {
         const template  = await db.deleteRecord('manuscript_templates', template_id, 'template_id');
        if(!template) return res.status(404).json({ message: 'Template not found.' });
          res.status(200).json({ message: 'Template deleted successfully.' });
    } catch (error) {
       console.error('Error deleting  manuscript template:', error);
       res.status(500).json({ message: `Failed to delete the manuscript template. ${error.message}` });
    }
});

/**
 * @swagger
 * /reports/{report_id}/export/pdf:
 *   get:
 *     summary: Exports report to a PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to export.
 *         schema:
 *           type: string
  *     responses:
 *       200:
 *         description: Report exported to PDF successfully.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
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
 *                message: 'Failed to export report to pdf.'
 */
router.get('/reports/:report_id/export/pdf', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
     const { report_id } = req.params;
    try {
        //Implement PDF export using libraries
         res.status(200).send('PDF data here'); //  For now returning the string message
    } catch (error) {
        console.error('Error exporting report to PDF:', error);
        res.status(500).json({ message: `Failed to export report to pdf. ${error.message}` });
    }
});
/**
 * @swagger
 * /reports/{report_id}/export/word:
 *   get:
 *     summary: Exports report to a word document.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to export.
 *         schema:
 *           type: string
  *     responses:
 *       200:
 *         description: Report exported to word successfully.
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
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
 *                message: 'Failed to export report to word.'
 */
router.get('/reports/:report_id/export/word', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
   const { report_id } = req.params;
   try {
     //Implement word document export logic
      res.status(200).send('Word document data here.'); //  For now returning the string message
  } catch (error) {
    console.error('Error exporting report to word:', error);
     res.status(500).json({ message: `Failed to export report to word. ${error.message}` });
  }
});

/**
 * @swagger
 * /reports/{report_id}/export/excel:
 *   get:
 *     summary: Export a report in excel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to export.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report exported to excel successfully.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
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
 *                message: 'Failed to export report to excel.'
 */
router.get('/reports/:report_id/export/excel', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
   const { report_id } = req.params;
   try {
     // Implement Excel Export logic
      res.status(200).send('Excel data here.'); //  For now returning the string message
   } catch (error) {
     console.error('Error exporting report to excel:', error);
       res.status(500).json({ message: `Failed to export report to excel. ${error.message}` });
   }
});
/**
 * @swagger
 * /reports/{report_id}/export/csv:
 *   get:
 *     summary: Exports report to a csv
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         description: ID of the report to export.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report exported to CSV successfully.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
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
 *                message: 'Failed to export report to CSV.'
 */
router.get('/reports/:report_id/export/csv', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
 const { report_id } = req.params;
    try {
        // Implement csv export logic
        res.status(200).send('csv data here'); //  For now returning the string message
    } catch (error) {
        console.error('Error exporting report to CSV:', error);
        res.status(500).json({ message: `Failed to export report to CSV. ${error.message}` });
    }
});

/**
 * @swagger
 * /manuscripts/{manuscript_id}/export/pdf:
 *   get:
 *     summary: Exports manuscript to a PDF.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manuscript_id
 *         required: true
 *         description: ID of the manuscript to export.
 *         schema:
 *           type: string
  *     responses:
 *       200:
 *         description: Manuscript exported to PDF successfully.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
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
 *                message: 'Failed to export manuscript to PDF.'
 */
router.get('/manuscripts/:manuscript_id/export/pdf', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
  const { manuscript_id } = req.params;
   try {
     // Implement PDF export logic
        res.status(200).send('PDF data here.');  //  For now returning the string message
    } catch (error) {
        console.error('Error exporting manuscript to PDF:', error);
         res.status(500).json({ message: `Failed to export manuscript to PDF. ${error.message}` });
     }
});

/**
 * @swagger
 * /manuscripts/{manuscript_id}/export/word:
 *   get:
 *     summary: Exports manuscript to a word document.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manuscript_id
 *         required: true
 *         description: ID of the manuscript to export.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manuscript exported to word successfully.
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
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
 *                message: 'Failed to export manuscript to word.'
 */
router.get('/manuscripts/:manuscript_id/export/word', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
   const { manuscript_id } = req.params;
   try {
    // Implement word document export logic
       res.status(200).send('Word document data here.');//  For now returning the string message
    } catch (error) {
        console.error('Error exporting manuscript to word:', error);
        res.status(500).json({ message: `Failed to export manuscript to word. ${error.message}` });
    }
});

/**
 * @swagger
 * /visualization/export:
 *  post:
 *     summary: Generate and export visualization.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *                chart_type:
 *                    type: string
 *                    description: type of chart (bar, pie , etc)
 *                data:
 *                    type: array
 *                    description: chart data object to generate chart
 *                options:
 *                   type: object
 *                   description: chart options configurations
 *             example:
 *                chart_type: "bar"
 *                data: "[{},{}]"
 *                options: "{}"
 *     responses:
 *       200:
 *         description: Visualization exported successfully
 *         content:
 *           application/octet-stream:
 *              schema:
 *                 type: string
 *                 format: binary
 *       400:
 *          description: Bad request, missing required input fields.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Chart type, data, options are required.'
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
 *                message: 'Failed to export the visualization.'
 */
router.post('/visualization/export', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
    const { chart_type, data, options } = req.body;
    if (!chart_type || !data || !options) {
        return res.status(400).json({ message: 'Chart type, data, options are required.' });
    }
    try {
      //Implement visualization export using charting libraries and return binary or url for the image
        res.status(200).send('Visualization data here (image or chart data)'); // placeholder for now
    } catch (error) {
      console.error('Error generating and exporting the visualization:', error);
      res.status(500).json({ message: `Failed to export the visualization. ${error.message}` });
  }
});

module.exports = router;