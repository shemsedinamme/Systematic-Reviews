const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('./database');
const { authorizeRole } = require('./authMiddleware');
const router = express.Router();

/**
 * @swagger
 * /protocols:
 *   get:
 *     summary: Get all protocols
 *     description: Retrieves a list of all protocols
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of protocols retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   protocol_id:
 *                     type: string
 *                     description: The unique identifier of the protocol.
 *                   template_id:
 *                     type: string
 *                     description: The id of the template for the protocol
 *                   project_id:
 *                      type: string
 *                      description: The unique id for the project
 *                   title:
 *                     type: string
 *                     description: Title of the protocol
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
 *                message: 'Failed to fetch protocols.'
 */
router.get('/protocols', async (req, res) => {
    try {
        const [protocols] = await pool.query('SELECT * FROM protocols');
        res.status(200).json(protocols);
    } catch (error) {
        console.error('Error fetching protocols:', error);
        res.status(500).json({ message: 'Failed to fetch protocols.' });
    }
});


/**
 * @swagger
 * /protocols:
 *   post:
 *     summary: Create a new protocol
 *     description: Creates a new protocol using a template and project ID.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               template_id:
 *                 type: string
 *                 description: The ID of the template to use.
 *               project_id:
 *                 type: string
 *                 description: The ID of the project to attach this protocol to.
 *               title:
 *                 type: string
 *                 description: Title for the protocol.
 *             example:
 *               template_id: "template_id"
 *               project_id: "project_id"
 *               title: "New protocol title"
 *     responses:
 *       201:
 *         description: Protocol created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
  *                   protocol_id:
  *                      type: string
 *                       description: unique id of the protocol
 *                   template_id:
 *                     type: string
 *                     description: The id of the template for this protocol
 *                   project_id:
 *                     type: string
 *                     description: The unique id of the project for this protocol
  *                   title:
 *                     type: string
 *                     description: Title of the protocol
 *                  sections:
 *                      type: array
 *                      description: array of sections for this protocol
 *                      items:
 *                           type: object
 *                           properties:
 *                              section_id:
 *                                  type: string
 *                                 description: unique id for the protocol section
 *                              section_name:
 *                                 type: string
 *                                description: name of the section
 *                              content:
 *                                 type: string
 *                                 description: Content of the section

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
 *                message: 'Template id, project id and title is required to create a protocol.'
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
 *                message: 'Failed to create protocol.'
 */
router.post('/protocols',  async (req, res) => {
    const { template_id, project_id, title } = req.body;
      if (!template_id || !project_id || !title) {
        return res.status(400).json({ message: 'Template id, project id and title is required to create a protocol.' });
    }
    try {
        const [newProtocol] = await pool.query(
            'INSERT INTO protocols (protocol_id, template_id, project_id, title) VALUES (?, ?, ?, ?) ',
            [uuidv4(), template_id, project_id, title]
        );
        const [templateSections] = await pool.query('SELECT section_id, section_name from template_sections WHERE template_id = ?', [template_id]);
        const protocol = {
             protocol_id: uuidv4(),
             template_id: template_id,
             project_id: project_id,
             title: title,
            sections: templateSections.map(section=> ({...section, content: ''}))
         }
          await Promise.all(templateSections.map(async (section)=>{
                 await pool.query('INSERT INTO protocol_sections (section_id, protocol_id, section_name, content) VALUES (?,?,?,?)', [uuidv4(), protocol.protocol_id, section.section_name, ''])
        }))
        res.status(201).json(protocol);
    } catch (error) {
        console.error('Error creating protocol:', error);
        res.status(500).json({ message: 'Failed to create protocol.' });
    }
});


/**
 * @swagger
 * /protocols/{protocol_id}:
 *   get:
 *     summary: Get a protocol by id
 *     description: Gets a protocol based on the protocol id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: protocol_id
 *         required: true
 *         description: ID of the protocol to get.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Protocol fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
  *                   protocol_id:
  *                      type: string
 *                       description: unique id of the protocol
 *                   template_id:
 *                     type: string
 *                     description: The id of the template for this protocol
 *                   project_id:
 *                     type: string
 *                     description: The unique id of the project for this protocol
  *                   title:
 *                     type: string
 *                     description: Title of the protocol
 *                  sections:
 *                      type: array
 *                      description: array of sections for this protocol
 *                      items:
 *                           type: object
 *                           properties:
 *                              section_id:
 *                                  type: string
 *                                 description: unique id for the protocol section
 *                              section_name:
 *                                 type: string
 *                                description: name of the section
 *                              content:
 *                                 type: string
 *                                 description: Content of the section
 *       404:
 *         description: Protocol not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *             example:
 *                message: 'Protocol not found.'
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
 *                message: 'Failed to fetch protocol.'
 */
router.get('/protocols/:protocolId', async (req, res) => {
    const { protocolId } = req.params;
    try {
       const [protocol] = await pool.query('SELECT * from protocols WHERE protocol_id = ?', [protocolId]);
        if(protocol.length === 0) return res.status(404).json({message: 'Protocol not found'});
        const [protocolSections] = await pool.query('SELECT section_id, section_name, content from protocol_sections WHERE protocol_id = ?', [protocolId]);
        res.status(200).json({...protocol[0], sections: protocolSections});
    } catch (error) {
        console.error('Error fetching protocol:', error);
        res.status(500).json({ message: 'Failed to fetch protocol.' });
    }
});


/**
 * @swagger
 * /templates:
 *   get:
 *     summary: Get all protocol templates
 *     description: Retrieves a list of all protocol templates.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of templates retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                    template_id:
 *                       type: string
 *                       description: unique id of the template
 *                    template_name:
 *                        type: string
 *                        description: name of the template
 *                    template_description:
 *                         type: string
 *                         description: description of the template
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
 *                message: 'Failed to fetch templates.'
 */
router.get('/templates', async (req, res) => {
    try {
        const [templates] = await pool.query('SELECT * FROM templates');
        res.status(200).json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ message: 'Failed to fetch templates.' });
    }
});

/**
 * @swagger
 * /templates:
 *   post:
 *     summary: Creates a new protocol template.
 *     description: Creates a new protocol template.
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
 *               template_description:
 *                 type: string
 *                 description: Description of the template.
 *               sections:
 *                  type: array
 *                  description: Array of sections
 *                  items:
 *                      type: object
 *                      properties:
 *                          section_name:
 *                              type: string
 *                              description: name of the section.
 *                          data_fields:
 *                             type: array
 *                             description: array of data fields
 *                             items:
 *                                 type: object
 *                                 properties:
 *                                     field_name:
 *                                         type: string
 *                                         description: name of the data field
 *             example:
 *                template_name: "Systematic Review Template"
 *                template_description: "This is a template for a systematic review"
 *                sections:
 *                   - section_name: "Background"
 *                     data_fields:
 *                        - field_name: "title"
 *                        - field_name: "author"
 *                   - section_name: "Methods"
 *                     data_fields:
 *                        - field_name: "search strategy"
 *                        - field_name: "inclusion criteria"
 *     responses:
 *       201:
 *         description: New template created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   template_id:
 *                      type: string
 *                      description: unique id for this template
 *                   template_name:
 *                      type: string
 *                      description: Name of the template
 *                   template_description:
 *                      type: string
 *                      description: Description of the template
 *                   sections:
 *                      type: array
 *                      description: array of sections for this template
 *                      items:
 *                         type: object
 *                         properties:
 *                            section_id:
 *                               type: string
 *                               description: id of the section
 *                            section_name:
 *                               type: string
 *                               description: name of the section
  *                            data_fields:
 *                               type: array
 *                               description: array of data fields for this section
 *                               items:
 *                                   type: object
 *                                   properties:
 *                                      field_id:
 *                                         type: string
 *                                         description: id of the data field
 *                                      field_name:
 *                                         type: string
 *                                         description: name of the data field
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
 *                message: 'Template name and description required'
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
 *                message: 'Failed to create template.'
 */
router.post('/templates',  async (req, res) => {
    const { template_name, template_description, sections } = req.body;
     if (!template_name || !template_description) {
        return res.status(400).json({ message: 'Template name and description required' });
    }
    try {
        const [newTemplate] = await pool.query(
            'INSERT INTO templates (template_id, template_name, template_description) VALUES (?, ?, ?) ',
            [uuidv4(), template_name, template_description]
        );

       const template = {
          template_id: uuidv4(),
          template_name: template_name,
           template_description: template_description,
           sections: []
       }
      if(sections && sections.length > 0){
            const templateSections = await Promise.all(sections.map(async (section)=>{
              const [newTemplateSection] = await pool.query(
                    'INSERT INTO template_sections (section_id, template_id, section_name) VALUES (?, ?, ?) ',
                    [uuidv4(), template.template_id, section.section_name]
                );
                const dataFields = await Promise.all(section.data_fields?.map(async (field) =>{
                     const [newField] = await pool.query(
                            'INSERT INTO template_data_fields (field_id, section_id, field_name) VALUES (?, ?, ?) ',
                             [uuidv4(), newTemplateSection.section_id, field.field_name]
                            )
                      return newField
                  }))
                return {...newTemplateSection, data_fields: dataFields}
              }))
          template.sections = templateSections;
      }
       res.status(201).json(template);

    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ message: 'Failed to create template.' });
    }
});

/**
 * @swagger
 * /templates/{template_id}:
 *   get:
 *     summary: Get a protocol template by id
 *     description: Gets a protocol template based on the template id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template_id
 *         required: true
 *         description: ID of the template to get
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
 *                  template_id:
 *                      type: string
 *                      description: unique id of the template
 *                   template_name:
 *                       type: string
 *                       description: name of the template
 *                   template_description:
 *                        type: string
 *                       description: Description of the template
  *                   sections:
 *                      type: array
 *                      description: array of sections
 *                      items:
 *                           type: object
 *                           properties:
 *                              section_id:
 *                                  type: string
 *                                  description: unique id for the template section
 *                              section_name:
 *                                 type: string
 *                                description: name of the section
   *                              data_fields:
 *                                type: array
 *                                description: array of data fields for the template section
 *                                items:
 *                                    type: object
 *                                    properties:
 *                                         field_id:
 *                                            type: string
 *                                            description: unique id for the data field
 *                                          field_name:
 *                                             type: string
 *                                             description: name of the data field
 *       404:
 *          description: Template not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Template not found'
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
 *                message: 'Failed to fetch template'
 */
router.get('/templates/:templateId', async (req, res) => {
    const { templateId } = req.params;
     try {
          const [template] = await pool.query('SELECT * from templates WHERE template_id = ?', [templateId]);
        if(template.length === 0) return res.status(404).json({message: 'Template not found'});
        const [templateSections] = await pool.query('SELECT section_id, section_name from template_sections WHERE template_id = ?', [templateId]);
          const sections = await Promise.all(templateSections.map(async (section) =>{
                const [dataFields] = await pool.query('SELECT field_id, field_name from template_data_fields WHERE section_id = ?', [section.section_id])
              return {...section, data_fields: dataFields};
          }))
         res.status(200).json({...template[0], sections: sections});

    } catch (error) {
         console.error('Error fetching template:', error);
        res.status(500).json({message: 'Failed to fetch template'});
    }
});

router.put('/protocols/:protocolId/sections/:sectionId',  async (req, res) => {
    const { protocolId, sectionId } = req.params;
    const { content } = req.body;
   try {
      const [updatedSection] = await pool.query(
        'UPDATE protocol_sections SET content = ? WHERE protocol_id = ? AND section_id = ?',
          [content, protocolId, sectionId]);
    if(updatedSection.affectedRows === 0) return res.status(404).json({message: 'Section not found'});
       res.status(200).json({message: 'Section content updated successfully'});
  } catch (error) {
    console.error('Error updating protocol section:', error);
    res.status(500).json({ message: 'Failed to update protocol section.' });
 }
});
router.post('/protocols/:protocolId/comments', async (req, res) => {
  const { protocolId } = req.params;
  const { text } = req.body;
  if(!text){
      return res.status(400).json({message: 'Comment text is required.'});
    }
   try {
       const [newComment] = await pool.query('INSERT INTO comments (comment_id, protocol_id, user_id, text) VALUES (?, ?, ?, ?) ', [uuidv4(), protocolId, req.user.user_id, text]);
         const comment = {
           comment_id: uuidv4(),
           protocol_id: protocolId,
           text: text,
           user_id: req.user.user_id
         }
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment to protocol:', error);
        res.status(500).json({ message: 'Failed to add comment to protocol.' });
    }
});
router.get('/protocols/:protocolId/comments', async (req, res) => {
    const { protocolId } = req.params;
    try {
        const [comments] = await pool.query('SELECT * FROM comments WHERE protocol_id = ?', [protocolId]);
        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching protocol comments:', error);
        res.status(500).json({ message: 'Failed to fetch protocol comments.' });
    }
});
router.post('/protocols/:protocolId/versions/:versionId/revert', async (req, res) => {
    const {protocolId, versionId} = req.params;
      try {
        const [version] = await pool.query('SELECT content from document_versions WHERE version_id = ? AND document_id = (select document_id from documents where project_id = ?)', [versionId, protocolId]);
            if(version.length === 0) return res.status(404).json({message: 'Version is not found'});

        const [updatedProtocol] = await pool.query('UPDATE protocols SET content = ? WHERE protocol_id = ? ', [version[0].content, protocolId] );
           res.status(200).json({ content: version[0].content});
     } catch (error) {
        console.error('Error reverting to the version:', error);
          res.status(500).json({ message: 'Failed to revert to the version.' });
    }
});
router.get('/protocols/:protocolId/versions',  async (req, res) => {
     const {protocolId} = req.params;
      try {
          const [versions] = await pool.query('SELECT version_id, version_date from document_versions WHERE document_id = (SELECT document_id from documents WHERE project_id = ?)', [protocolId]);
            res.status(200).json(versions);
      } catch (error) {
           console.error('Error fetching document versions', error);
        res.status(500).json({ message: 'Failed to fetch document versions.' });
    }
});
router.get('/versions/:versionId', async (req, res) => {
    const {versionId} = req.params;
      try {
          const [version] = await pool.query('SELECT content from document_versions WHERE version_id = ?', [versionId]);
        if(version.length === 0) return res.status(404).json({message: 'Version not found'});
           res.status(200).json({content: version[0].content})
      } catch (error) {
          console.error('Error fetching version:', error);
          res.status(500).json({message: 'Failed to fetch version.'})
      }
});
router.post('/protocols/:protocolId/reviews',  async (req, res) => {
  const { protocolId } = req.params;
    const { section_id, reviewer_id } = req.body;
     if (!section_id || !reviewer_id) return res.status(400).json({ message: 'Section id, and reviewer ids are required for review' });
  try {
        const [newReview] = await pool.query(
            'INSERT INTO protocol_reviews (review_id, protocol_id, section_id, reviewer_id) VALUES (?, ?, ?, ?) ',
            [uuidv4(), protocolId, section_id, reviewer_id]
        );
         const [section] = await pool.query(
                'SELECT section_name FROM protocol_sections where section_id = ?',
               [section_id]
        );
       const review = {
             review_id: uuidv4(),
             section_id: section_id,
            section_name: section[0].section_name,
             reviewer_id: reviewer_id
        }
    res.status(201).json(review);
  } catch (error) {
     console.error('Error assigning reviewer:', error);
        res.status(500).json({ message: 'Failed to assign reviewer' });
    }
});
router.get('/protocols/:protocolId/reviews', async (req, res) => {
    const {protocolId} = req.params;
    try {
        const [reviews] = await pool.query(
            `SELECT pr.review_id, pr.section_id, pr.reviewer_id, pr.comment, ps.section_name
                 FROM protocol_reviews pr
                 JOIN protocol_sections ps ON pr.section_id = ps.section_id
                  WHERE pr.protocol_id = ?`,
            [protocolId]
        );
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching protocol reviews:', error);
        res.status(500).json({ message: 'Failed to fetch protocol reviews.' });
    }
});
router.put('/reviews/:reviewId', async(req, res) => {
    const { reviewId } = req.params;
      const { comment } = req.body;
    if(!comment) return res.status(400).json({message: 'Comment is required for updating the review'});
    try {
         const [updatedReview] = await pool.query(
            'UPDATE protocol_reviews SET comment = ? WHERE review_id = ?',
            [comment, reviewId]
         );
           if(updatedReview.affectedRows === 0) return res.status(404).json({message:'Review not found'});
         res.status(200).json({...updatedReview[0], comment: comment});
   } catch (error) {
         console.error('Error updating the review:', error);
          res.status(500).json({ message: 'Failed to update the review.' });
    }
});
router.get('/protocols/:protocolId/approvals', async (req, res) => {
     const { protocolId } = req.params;
       try {
           const [approvals] = await pool.query('SELECT * from protocol_approvals WHERE protocol_id = ?', [protocolId]);
            res.status(200).json(approvals);
       } catch (error) {
            console.error('Error fetching protocol approval history:', error);
            res.status(500).json({ message: 'Failed to fetch protocol approval history.' });
        }
});

router.post('/protocols/:protocolId/approvals', async (req, res) => {
   const { protocolId } = req.params;
    try {
          const [approval] = await pool.query(
               'INSERT INTO protocol_approvals (approval_id, protocol_id, user_id, approval_date) VALUES (?, ?, ?, NOW()) ',
                [uuidv4(), protocolId, req.user.user_id]
          );
          const newApproval = {
            approval_id: uuidv4(),
             protocol_id: protocolId,
            user_id: req.user.user_id,
             approval_date: new Date(),
          }
           res.status(201).json(newApproval);
    } catch (error) {
       console.error('Error approving protocol:', error);
        res.status(500).json({ message: 'Failed to approve the protocol.' });
    }
});
router.post('/templates/:templateId/share',  authorizeRole('admin'), async(req, res) => {
   const { templateId } = req.params;
    try {
      //TODO: Implement sharing functionality.
       res.status(200).json({ message: 'Template shared successfully.' });
    } catch (error) {
      console.error('Error sharing template:', error);
     res.status(500).json({ message: 'Failed to share template.' });
    }
})
module.exports = router;