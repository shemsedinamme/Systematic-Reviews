dataSynthesisRoutes.js 
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('./database');
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const Database = require('./database');  // Import database class
const simpleStatistics = require('simple-statistics');

const router = express.Router();
const db = new Database(pool); // Create Database instance
/**
 * @swagger
 * /data-synthesis/synthesis:
 *   get:
 *     summary: Fetch a list of data synthesis results for a project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         description: ID of the project.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched data synthesis results.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                     synthesis_id:
 *                       type: string
 *                       description: Unique id for the data synthesis record
 *                     project_id:
 *                       type: string
 *                       description: Project ID
 *                     synthesis_type:
 *                       type: string
 *                       description: The type of synthesis record.
 *                     synthesis_description:
 *                       type: string
 *                       description: The description of the synthesis.
 *                     created_at:
 *                        type: string
 *                        format: date-time
 *                        description: The date and time when the record was created.
 *       400:
 *          description: Bad request, project id is required.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Project ID is required.'
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
 *                message: 'Error fetching synthesis results.'
 */
router.get('/data-synthesis/synthesis', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
    const { project_id } = req.query;
     if (!project_id) {
       return res.status(400).json({ message: 'Project ID is required.' });
      }
      try {
         const syntheses = await db.getAllRecord('data_synthesis_results',()=>({})) // using default transform
          res.status(200).json(syntheses);
    } catch (error) {
      res.status(500).json({ message: `Error fetching synthesis results ${error.message}` });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis:
 *   post:
 *     summary: Create a new synthesis entry.
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
 *                 description: The project ID.
 *               synthesis_type:
 *                 type: string
 *                 description: Type of synthesis.
  *               synthesis_description:
 *                  type: string
 *                  description: Description of the synthesis
 *             example:
 *                 project_id: "6b7b6172-d59c-4f12-9e7d-6527d0e210d1"
 *                 synthesis_type: "meta-analysis"
 *                 synthesis_description: "Meta analysis of outcome X"
 *     responses:
 *       201:
 *         description: Synthesis entry created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  synthesis_id:
 *                      type: string
 *                      description: The unique identifier for the synthesis result.
 *                   project_id:
 *                      type: string
 *                      description: project id
 *                   synthesis_type:
 *                     type: string
 *                      description: type of data synthesis
 *                   synthesis_description:
 *                     type: string
 *                     description: description of the synthesis
 *                    created_at:
 *                       type: string
 *                       format: date-time
 *                       description: The time stamp when data synthesis was created.
 *       400:
 *          description: Bad request, missing required input
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
 *                message: 'Error creating synthesis.'
 */
router.post('/data-synthesis/synthesis', authenticateToken, authorizeRole(['admin', 'lead_author']), async (req, res) => {
    const { project_id, synthesis_type, synthesis_description } = req.body;
    if (!project_id || !synthesis_type || !synthesis_description) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const newSynthesis = {
          synthesis_id: uuidv4(),
          project_id,
           synthesis_type,
           synthesis_description,
            created_at: new Date()
    };
    try {
        const data = await  db.insertRecord('data_synthesis_results', newSynthesis, ['project_id', 'synthesis_type','synthesis_description']) // specific validation if needs any or model check could be here before insertion in helper class itself, also generic null check from method it self
       res.status(201).json(data);
    } catch (error) {
     res.status(500).json({ message: `Error creating synthesis.  ${error.message}` });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}:
 *   get:
 *     summary: Fetch details of a specific synthesis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to fetch.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched details of the synthesis record.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    synthesis_id:
 *                      type: string
 *                      description: The unique identifier for the synthesis result.
 *                   project_id:
 *                      type: string
 *                      description: project id
 *                   synthesis_type:
 *                     type: string
 *                      description: type of data synthesis
 *                   synthesis_description:
 *                     type: string
 *                     description: description of the synthesis
 *                    created_at:
 *                       type: string
 *                       format: date-time
 *                       description: The time stamp when data synthesis was created.
 *                   meta_analysis_results:
 *                      type: object
 *                       description: object of meta analysis if available
 *                   narrative_summary:
 *                       type: string
 *                       description: the summary of the narrative synthesis, if available.
 *       404:
 *          description: Synthesis not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Synthesis not found.'
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
 *                message: 'Error fetching synthesis details.'
 */
router.get('/data-synthesis/synthesis/:synthesis_id', authenticateToken, authorizeRole(['admin', 'lead_author', 'reviewer']), async (req, res) => {
    const { synthesis_id } = req.params;
    try {
        const synthesis = await db.getRecordById('data_synthesis_results', synthesis_id, 'synthesis_id',()=>({})) //default tranformation if not found
           if (!synthesis) {
              return res.status(404).json({ message: 'Synthesis not found.' });
          }
        res.status(200).json(synthesis);
      } catch (error) {
         res.status(500).json({ message: `Error fetching synthesis details. ${error.message}` });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}:
 *   put:
 *     summary: Update details of a specific synthesis for a project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to update.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               synthesis_description:
 *                  type: string
 *                  description: Description of the synthesis
 *             example:
 *                synthesis_description: "Updated meta analysis of outcome X"
 *     responses:
 *       200:
 *         description: Details of the specific synthesis updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   synthesis_id:
 *                      type: string
 *                      description: The unique identifier for the synthesis result.
 *                   project_id:
 *                      type: string
 *                      description: project id
 *                   synthesis_type:
 *                     type: string
 *                      description: type of data synthesis
 *                   synthesis_description:
 *                     type: string
 *                     description: description of the synthesis
 *                    created_at:
 *                       type: string
 *                       format: date-time
 *                       description: The time stamp when data synthesis was created.
 *                    meta_analysis_results:
 *                      type: object
 *                       description: object of meta analysis if available
 *       400:
 *          description: Bad request, synthesis_description is required
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Synthesis description is required.'
 *       404:
 *          description: Synthesis not found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Synthesis not found.'
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
 *                message: 'Error updating synthesis.'
 */
router.put('/data-synthesis/synthesis/:synthesis_id', authenticateToken, authorizeRole(['admin', 'lead_author']), async (req, res) => {
    const { synthesis_id } = req.params;
    const { synthesis_description } = req.body;
      if (!synthesis_description) {
           return res.status(400).json({ message: 'Synthesis description is required.' });
     }
    try {
       const data = await db.updateRecord('data_synthesis_results', { synthesis_description}, synthesis_id,'synthesis_id'); // just to update the description field
        if (!data) {
           return res.status(404).json({ message: 'Synthesis not found.' });
         }
          const updatedSynthesis  = await db.getRecordById('data_synthesis_results', synthesis_id, 'synthesis_id',()=>({})); // now read with updated data

        res.status(200).json(updatedSynthesis);
    } catch (error) {
        res.status(500).json({ message: `Error updating synthesis. ${error.message}` });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}:
 *   delete:
 *     summary: Delete a specific synthesis for a project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis record to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted the synthesis record.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *               message: "Synthesis deleted successfully."
 *       404:
 *          description: Synthesis not found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Synthesis not found.'
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
 *                message: 'Error deleting synthesis.'
 */
router.delete('/data-synthesis/synthesis/:synthesis_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { synthesis_id } = req.params;
    try {
        const deletedSynthesis = await db.deleteRecord('data_synthesis_results', synthesis_id, 'synthesis_id');
         if (!deletedSynthesis) {
             return res.status(404).json({ message: 'Synthesis not found.' });
         }
          res.status(200).json({ message: 'Synthesis deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error deleting synthesis. ${error.message}` });
    }
});
/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}/meta-analysis:
 *   post:
 *     summary: Perform a meta-analysis.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to perform the meta analysis.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               outcome:
 *                 type: string
 *                 description: The outcome of the meta analysis.
 *               model_type:
 *                 type: string
 *                 enum: ['fixed-effect', 'random-effects']
 *                 description: The model type to use for meta analysis.
 *               study_data:
 *                  type: array
 *                  description: Array of objects with study id, effect size, and standard error.
 *                  items:
 *                       type: object
 *                       properties:
 *                          study_id:
 *                             type: string
 *                             description: study Id
 *                          effect_size:
 *                              type: number
 *                              description: Effect size of the study
 *                          standard_error:
 *                             type: number
 *                              description: standard error value
 *             example:
 *                 outcome: "Mortality"
 *                 model_type: "fixed-effect"
 *                 study_data :  [
 *                    {
 *                       "study_id": "uuid",
 *                        "effect_size": 0.5,
 *                        "standard_error": 0.1
 *                    },
 *                   {
 *                      "study_id": "uuid",
 *                      "effect_size": 0.6,
 *                       "standard_error": 0.2
 *                   }]
 *     responses:
 *       200:
 *         description: Meta analysis performed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    meta_id:
 *                      type: string
 *                      description: The unique identifier for the meta analysis result.
 *                   synthesis_id:
 *                     type: string
 *                     description: synthesis id
 *                    outcome:
 *                      type: string
 *                      description: outcome of the meta-analysis.
 *                   model_type:
 *                      type: string
 *                      description: The meta-analysis model type used.
 *                   pooled_estimate:
 *                      type: number
 *                      description: The pooled estimate result from meta-analysis.
 *                   heterogeneity_i2:
 *                      type: number
 *                      description: Heterogeneity of the meta-analysis
 *                   forest_plot_data:
 *                      type: array
 *                      description: Data for the forest plot of meta-analysis
 *                   subgroup_analysis_data:
 *                       type: array
 *                      description: Sub group analysis data.
 *       400:
 *          description: Bad request, missing required inputs
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
 *                message: 'Error performing meta-analysis.'
 */
router.post('/data-synthesis/synthesis/:synthesis_id/meta-analysis', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
    const { synthesis_id } = req.params;
    const { outcome, model_type, study_data } = req.body;
    if (!outcome || !model_type || !study_data) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
     try {
         // Perform meta-analysis calculations here ( this is a dummy implementation for now)
      let pooled_estimate = 0;
        let weightsSum = 0;
         for (const study of study_data ) {
              const weight = 1 / Math.pow(parseFloat(study.standard_error), 2);
               pooled_estimate += parseFloat(study.effect_size) * weight;
            weightsSum += weight;
       }
        pooled_estimate =  pooled_estimate / weightsSum;
         const heterogeneity_i2 = 0.2;  // Placeholder
        const metaAnalysisResult = {
            meta_id: uuidv4(),
             synthesis_id,
            outcome,
            model_type,
            pooled_estimate,
           heterogeneity_i2,
          forest_plot_data: [{}],
            subgroup_analysis_data: [{}]
       };
      res.status(200).json(metaAnalysisResult);
    } catch (error) {
         console.error("meta anlysis error", error)
     res.status(500).json({ message: `Error performing meta-analysis. ${error.message}` });
  }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}/qualitative-synthesis:
 *   post:
 *     summary: Perform a qualitative data synthesis.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to perform the qualitative synthesis.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coding_scheme:
 *                 type: string
 *                 description: The coding schema.
 *               meta_aggregation_results:
 *                  type: array
 *                  description: The output for meta aggregation.
 *               thematic_analysis_results:
 *                  type: array
 *                  description: Results from the thematic analysis.
 *             example:
 *                 coding_scheme: "{theme: 'coding'}"
 *                 meta_aggregation_results: "[{},{}]"
 *                 thematic_analysis_results: "[{}]"
 *     responses:
 *       200:
 *         description: Qualitative synthesis performed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   qualitative_id:
 *                      type: string
 *                      description: The unique identifier for the qualitative data synthesis results.
 *                    synthesis_id:
 *                       type: string
 *                      description: synthesis id
 *                    coding_scheme:
 *                      type: object
 *                       description: user defined coding scheme object.
 *                    meta_aggregation_results:
 *                      type: array
 *                       description: The output for meta aggregation
 *                    thematic_analysis_results:
 *                       type: array
 *                        description: Results from the thematic analysis.
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
 *                message: 'Error performing qualitative synthesis.'
 */
router.post('/data-synthesis/synthesis/:synthesis_id/qualitative-synthesis', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
    const { synthesis_id } = req.params;
    const { coding_scheme, meta_aggregation_results, thematic_analysis_results } = req.body;
   if (!coding_scheme || !meta_aggregation_results || !thematic_analysis_results) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
          const qualitativeSynthesisResult = {
             qualitative_id: uuidv4(),
             synthesis_id,
            coding_scheme,
            meta_aggregation_results,
            thematic_analysis_results,
        };
       res.status(200).json(qualitativeSynthesisResult);
    } catch (error) {
         console.error("qualitative  synthesis error", error)
      res.status(500).json({ message: `Error performing qualitative synthesis. ${error.message}` });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}/narrative-synthesis:
 *   post:
 *     summary: Perform a narrative synthesis.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to perform the narrative synthesis.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               narrative_summary:
 *                 type: string
 *                 description: The summary of results and main findings.
 *             example:
 *                 narrative_summary: "summary of results and main findings..."
 *     responses:
 *       200:
 *         description: Narrative synthesis performed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  narrative_id:
 *                      type: string
 *                      description: The unique identifier for the narrative summary.
 *                  synthesis_id:
 *                    type: string
 *                    description: synthesis id
 *                   narrative_summary:
 *                      type: string
 *                      description: The summary of results and main findings.
 *       400:
 *          description: Bad request, narrative summary is required
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Narrative summary is required.'
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
 *                message: 'Error performing narrative synthesis.'
 */
router.post('/data-synthesis/synthesis/:synthesis_id/narrative-synthesis', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
    const { synthesis_id } = req.params;
     const { narrative_summary } = req.body;
     if (!narrative_summary) {
        return res.status(400).json({ message: 'Narrative summary is required.' });
    }
    try {
       const narrativeSynthesisResult = {
          narrative_id: uuidv4(),
          synthesis_id,
            narrative_summary,
        };
       res.status(200).json(narrativeSynthesisResult);
    } catch (error) {
        console.error("narrative  synthesis error", error)
        res.status(500).json({ message: `Error performing narrative synthesis. ${error.message}` });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}/network-meta-analysis:
 *   post:
 *     summary: Perform a network meta-analysis.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to perform network meta-analysis.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comparison_matrix:
 *                  type: array
 *                  description: matrix showing the treatment and comparison.
 *               network_plot_data:
 *                  type: array
 *                  description: plot data for network meta analysis.
 *             example:
 *                comparison_matrix: "[{},{}]"
 *                network_plot_data: "[{},{}]"
 *     responses:
 *       200:
 *         description: Network meta-analysis performed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    network_id:
 *                      type: string
 *                      description: The unique identifier for the network meta-analysis results.
 *                    synthesis_id:
 *                       type: string
 *                       description: synthesis id
 *                    comparison_matrix:
 *                      type: array
 *                      description: The matrix showing the treatment and comparison.
 *                    network_plot_data:
 *                       type: array
 *                        description: The plotted point data for network meta analysis (chart js compatible ).
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
 *                message: 'Error performing network meta-analysis.'
 */
router.post('/data-synthesis/synthesis/:synthesis_id/network-meta-analysis', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
    const { synthesis_id } = req.params;
    const { comparison_matrix, network_plot_data } = req.body;
    if (!comparison_matrix || !network_plot_data) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
        const networkMetaAnalysisResult = {
          network_id: uuidv4(),
          synthesis_id,
           comparison_matrix,
           network_plot_data,
        };
        res.status(200).json(networkMetaAnalysisResult);
    } catch (error) {
         console.error("network meta analysis error", error)
        res.status(500).json({ message: `Error performing network meta-analysis. ${error.message}` });
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
router.post('/tasks/:task_id/dependencies', authenticateToken, async (req, res) => {
    const { task_id } = req.params;
    const { dependency_id } = req.body;
    try {
        const [dependency] = await pool.query(
            'INSERT INTO task_dependencies (dependency_id, task_id) VALUES (?, ?) ',
            [dependency_id, task_id]
        );
        const [updatedTask] = await pool.query(
            'SELECT * FROM tasks WHERE task_id = ?',
            [task_id]
        );
        res.status(200).json({...updatedTask[0], dependencies: [dependency]});
    } catch (error) {
        console.error('Error adding task dependency:', error);
        res.status(500).json({ message: 'Failed to add task dependency.' });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}/publication-bias-assessment:
 *   post:
 *     summary: Perform publication bias assessment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to perform the publication bias assessment.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               funnel_plot_data:
 *                  type: array
 *                  description: plottable data for funnel plot
 *               eggers_test_p:
 *                  type: number
 *                  description: p value of eggers test.
 *               trim_and_fill_data:
 *                 type: array
 *                 description: Data output for trim and fill imputated points.
 *             example:
 *                  funnel_plot_data: "[{},{}]"
 *                  eggers_test_p: "0.04"
 *                  trim_and_fill_data: "[{},{}]"
 *     responses:
 *       200:
 *         description: Publication bias assessment performed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    bias_id:
 *                      type: string
 *                      description: The unique identifier for the publication bias assessment results.
 *                    synthesis_id:
 *                       type: string
 *                       description: synthesis id
 *                    funnel_plot_data:
 *                      type: array
 *                      description: The plotted points (data) for funnel plot.
 *                    eggers_test_p:
 *                       type: number
 *                       description: p value of eggers test.
 *                    trim_and_fill_data:
 *                       type: array
 *                        description: Data output for trim and fill imputated points.
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
 *                message: 'Error performing publication bias assessment.'
 */
router.post('/data-synthesis/synthesis/:synthesis_id/publication-bias-assessment', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
    const { synthesis_id } = req.params;
    const { funnel_plot_data, eggers_test_p, trim_and_fill_data } = req.body;
    if (!funnel_plot_data || !eggers_test_p || !trim_and_fill_data) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
        const publicationBiasResult = {
           bias_id: uuidv4(),
            synthesis_id,
            funnel_plot_data,
             eggers_test_p,
           trim_and_fill_data,
        };
        res.status(200).json(publicationBiasResult);
    } catch (error) {
        console.error('Error performing publication bias assessment:', error);
        res.status(500).json({ message: `Error performing publication bias assessment. ${error.message}` });
    }
});

/**
 * @swagger
 * /data-synthesis/synthesis/{synthesis_id}/sensitivity-analysis:
 *   post:
 *     summary: Perform sensitivity analysis for a synthesis.
 *     description: Performs a sensitivity analysis for a synthesis using the synthesis ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: synthesis_id
 *         required: true
 *         description: ID of the synthesis to perform sensitivity analysis.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               analysis_type:
 *                 type: string
 *                 description: The analysis type to be performed for the sensitivity.
 *               analysis_description:
 *                  type: string
 *                 description: The description or logic for the sensitivity analysis.
 *               analysis_results:
 *                   type: array
 *                   description: Results of the sensitivity analysis.
 *             example:
 *                  analysis_type: "Leave-one-out"
 *                  analysis_description: "Sensitivity analysis excluding studies one by one"
 *                  analysis_results: "[{},{}]"
 *     responses:
 *       200:
 *         description: Sensitivity analysis results.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    sensitivity_id:
 *                      type: string
 *                      description: The unique identifier of sensitivity analysis results.
 *                    synthesis_id:
 *                       type: string
 *                      description: synthesis id
 *                    analysis_type:
 *                       type: string
 *                      description: The analysis type used for sensitivity analysis.
 *                    analysis_description:
 *                      type: string
 *                      description: The description of the sensitivity analysis
 *                   analysis_results:
 *                     type: array
 *                     description: Results of sensitivity analysis
 *       400:
 *          description: Bad request, missing required fields
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
 *                message: 'Error performing sensitivity analysis.'
 */
router.post('/data-synthesis/synthesis/:synthesis_id/sensitivity-analysis', authenticateToken, authorizeRole(['admin', 'lead_author', 'synthesizer']), async (req, res) => {
    const { synthesis_id } = req.params;
     const { analysis_type, analysis_description, analysis_results } = req.body;
    if (!analysis_type || !analysis_description || !analysis_results) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
      try {
        const sensitivityAnalysisResult = {
            sensitivity_id: uuidv4(),
            synthesis_id,
             analysis_type,
             analysis_description,
           analysis_results,
        };
        res.status(200).json(sensitivityAnalysisResult);
    } catch (error) {
        console.error('Error performing sensitivity analysis:', error);
        res.status(500).json({ message: `Error performing sensitivity analysis. ${error.message}` });
    }
});
module.exports = router;

