// __tests__/reportRoutes.test.js
const request = require('supertest');
const app = require('../index'); // Adjust path to your main app file
const pool = require('../database')

// Mock authenticateToken middleware
jest.mock('../authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
      req.user = {user_id: 'test-user-id', role: 'admin'};
    next();
  },
    authorizeRole: (role) => (req, res, next) => {
    if(req.user && req.user.role === role){
        next();
     }else {
        return res.sendStatus(403);
       }
    }
}));

describe('Report Routes', () => {
    beforeEach(async () => {
       await pool.query('DELETE FROM report_templates');
       await pool.query('DELETE FROM report_metadata');
       await pool.query('DELETE FROM manuscripts');
        await pool.query('DELETE FROM manuscript_templates');
     });

    afterAll(async () => {
        await pool.end();
    });

    it('should create a new report template', async () => {
      const newTemplate = {
            template_name: "PRISMA Template",
            template_type: "systematic review",
           template_structure: "{}"
        };
        const response = await request(app)
            .post('/reports/templates')
            .set('Authorization', 'Bearer test-token')
            .send(newTemplate)
           .expect(201);
       expect(response.body).toHaveProperty('template_id');
        expect(response.body).toHaveProperty('template_name', newTemplate.template_name);
       expect(response.body).toHaveProperty('template_type', newTemplate.template_type)

      const [template] = await pool.query('SELECT * from report_templates WHERE template_id = ?', [response.body.template_id])
          expect(template.length).toBe(1)
          expect(template[0]).toHaveProperty('template_name', newTemplate.template_name)
        expect(template[0]).toHaveProperty('template_type', newTemplate.template_type)
    });

    it('should return 400 error if template name, type, or structure are missing during template creation', async () => {
        const response = await request(app)
            .post('/reports/templates')
            .set('Authorization', 'Bearer test-token')
              .send({})
            .expect(400);
           expect(response.body).toHaveProperty('message', 'Template name, type and structure are required')
    });

    it('should fetch all report templates', async () => {
        const newTemplate = {
              template_name: "PRISMA Template",
              template_type: "systematic review",
             template_structure: "{}"
          };
       await request(app)
              .post('/reports/templates')
              .set('Authorization', 'Bearer test-token')
              .send(newTemplate)
              .expect(201);
      const response = await request(app)
          .get('/reports/templates')
          .set('Authorization', 'Bearer test-token')
          .expect(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('template_name', newTemplate.template_name);
    expect(response.body[0]).toHaveProperty('template_type', newTemplate.template_type);
  });
    it('should create a new report', async () => {
        const newTemplate = {
            template_name: "PRISMA Template",
            template_type: "systematic review",
            template_structure: "{}"
          };
        const createTemplate = await request(app)
            .post('/reports/templates')
            .set('Authorization', 'Bearer test-token')
              .send(newTemplate)
            .expect(201);
       const newReport = {
            project_id: 'test-project-id',
            template_id: createTemplate.body.template_id
        };
        const response = await request(app)
           .post('/reports')
           .set('Authorization', 'Bearer test-token')
            .send(newReport)
           .expect(201);
      expect(response.body).toHaveProperty('report_id');
       expect(response.body).toHaveProperty('project_id', newReport.project_id);
      expect(response.body).toHaveProperty('template_id', newReport.template_id);
       const [report] = await pool.query('SELECT * from report_metadata WHERE report_id = ?', [response.body.report_id])
      expect(report.length).toBe(1)
       expect(report[0]).toHaveProperty('project_id', newReport.project_id)
        expect(report[0]).toHaveProperty('template_id', newReport.template_id)
    });
  it('should return 400 error if project id, or template id are missing during report creation', async () => {
       const response = await request(app)
          .post('/reports')
            .set('Authorization', 'Bearer test-token')
            .send({})
           .expect(400);
          expect(response.body).toHaveProperty('message', 'Project Id and template Id are required.')
  });
    it('should fetch a specific report', async () => {
           const newTemplate = {
                 template_name: "PRISMA Template",
                 template_type: "systematic review",
                 template_structure: "{}"
           };
           const createTemplate = await request(app)
                .post('/reports/templates')
                 .set('Authorization', 'Bearer test-token')
                .send(newTemplate)
                .expect(201);
          const newReport = {
                 project_id: 'test-project-id',
                 template_id: createTemplate.body.template_id,
               metadata: "{}"
           };
          const createdReport = await request(app)
              .post('/reports')
             .set('Authorization', 'Bearer test-token')
              .send(newReport)
             .expect(201);
      const response = await request(app)
          .get(`/reports/${createdReport.body.report_id}`)
            .set('Authorization', 'Bearer test-token')
          .expect(200);
         expect(response.body).toHaveProperty('report_id', createdReport.body.report_id)
         expect(response.body).toHaveProperty('project_id', newReport.project_id);
         expect(response.body).toHaveProperty('template_id', newReport.template_id);
          expect(response.body).toHaveProperty('metadata', newReport.metadata);
   });

  it('should return 404 error if report is not found', async () => {
      const response = await request(app)
          .get(`/reports/non-existing-report`)
            .set('Authorization', 'Bearer test-token')
          .expect(404);
        expect(response.body).toHaveProperty('message', 'Report not found.')
    });
    it('should update the metadata of a specific report', async () => {
      const newTemplate = {
                 template_name: "PRISMA Template",
                 template_type: "systematic review",
                template_structure: "{}"
           };
           const createTemplate = await request(app)
               .post('/reports/templates')
               .set('Authorization', 'Bearer test-token')
                .send(newTemplate)
                .expect(201);
          const newReport = {
                 project_id: 'test-project-id',
                 template_id: createTemplate.body.template_id,
               metadata: "{}"
          };
          const createdReport = await request(app)
             .post('/reports')
           .set('Authorization', 'Bearer test-token')
             .send(newReport)
            .expect(201);
        const updateMetadata = {
              metadata: '{"author": "John Doe"}'
          }
        const response = await request(app)
            .put(`/reports/${createdReport.body.report_id}`)
              .set('Authorization', 'Bearer test-token')
            .send(updateMetadata)
          .expect(200);
      expect(response.body).toHaveProperty('report_id', createdReport.body.report_id)
      expect(response.body).toHaveProperty('metadata', updateMetadata.metadata);
       const [report] = await pool.query('SELECT * from report_metadata WHERE report_id = ?', [createdReport.body.report_id]);
        expect(report[0]).toHaveProperty('metadata', updateMetadata.metadata);

    });
  it('should return 404 error when updating a report with an non-existing report_id', async () => {
        const updateMetadata = {
            metadata: '{"author": "John Doe"}'
        }
        const response = await request(app)
            .put(`/reports/non-existing-report`)
             .set('Authorization', 'Bearer test-token')
           .send(updateMetadata)
          .expect(404);
          expect(response.body).toHaveProperty('message', 'Report not found.')
    });
    it('should delete a specific report', async () => {
       const newTemplate = {
                 template_name: "PRISMA Template",
                 template_type: "systematic review",
                template_structure: "{}"
           };
         const createTemplate = await request(app)
            .post('/reports/templates')
             .set('Authorization', 'Bearer test-token')
            .send(newTemplate)
            .expect(201);
        const newReport = {
               project_id: 'test-project-id',
              template_id: createTemplate.body.template_id,
           };
           const createdReport = await request(app)
             .post('/reports')
             .set('Authorization', 'Bearer test-token')
           .send(newReport)
            .expect(201);
        const response = await request(app)
            .delete(`/reports/${createdReport.body.report_id}`)
           .set('Authorization', 'Bearer test-token')
          .expect(200);
        expect(response.body).toHaveProperty('message', 'Report deleted successfully.');
       const [report] = await pool.query('SELECT * from report_metadata WHERE report_id = ?', [createdReport.body.report_id])
        expect(report.length).toBe(0)
    });

  it('should return 404 error if trying to delete non existing report', async () => {
         const response = await request(app)
            .delete(`/reports/non-existing-report`)
            .set('Authorization', 'Bearer test-token')
           .expect(404);
         expect(response.body).toHaveProperty('message', 'Report not found.');
   });

    it('should fetch a specific report template', async () => {
        const newTemplate = {
                 template_name: "PRISMA Template",
                 template_type: "systematic review",
                template_structure: "{}"
           };
        const createdTemplate = await request(app)
            .post('/reports/templates')
             .set('Authorization', 'Bearer test-token')
           .send(newTemplate)
          .expect(201);
        const response = await request(app)
           .get(`/reports/templates/${createdTemplate.body.template_id}`)
           .set('Authorization', 'Bearer test-token')
            .expect(200);
       expect(response.body).toHaveProperty('template_id', createdTemplate.body.template_id);
       expect(response.body).toHaveProperty('template_name', newTemplate.template_name);
      expect(response.body).toHaveProperty('template_type', newTemplate.template_type);
    });
  it('should return 404 error if template is not found', async () => {
        const response = await request(app)
            .get(`/reports/templates/non-existing-template`)
            .set('Authorization', 'Bearer test-token')
            .expect(404);
          expect(response.body).toHaveProperty('message', 'Report template not found.')
  });
    it('should update a specific report template', async () => {
      const newTemplate = {
                 template_name: "PRISMA Template",
                 template_type: "systematic review",
                template_structure: "{}"
           };
      const createdTemplate = await request(app)
            .post('/reports/templates')
            .set('Authorization', 'Bearer test-token')
              .send(newTemplate)
            .expect(201);
          const updatedTemplate = {
                 template_name: "New PRISMA Template",
                 template_type: "scoping review",
               template_structure: "{}"
          };
      const response = await request(app)
           .put(`/reports/templates/${createdTemplate.body.template_id}`)
           .set('Authorization', 'Bearer test-token')
          .send(updatedTemplate)
           .expect(200);
        expect(response.body).toHaveProperty('template_id', createdTemplate.body.template_id);
        expect(response.body).toHaveProperty('template_name', updatedTemplate.template_name);
        expect(response.body).toHaveProperty('template_type', updatedTemplate.template_type);
       const [template] = await pool.query('SELECT * from report_templates WHERE template_id = ?', [createdTemplate.body.template_id])
      expect(template[0]).toHaveProperty('template_name', updatedTemplate.template_name)
      expect(template[0]).toHaveProperty('template_type', updatedTemplate.template_type)
    });
  it('should return 404 error if template is not found on update', async () => {
      const updatedTemplate = {
                 template_name: "New PRISMA Template",
                 template_type: "scoping review",
                  template_structure: "{}"
          };
        const response = await request(app)
            .put(`/reports/templates/non-existing-template`)
            .set('Authorization', 'Bearer test-token')
            .send(updatedTemplate)
            .expect(404);
          expect(response.body).toHaveProperty('message', 'Report template not found.')
  });
    it('should delete a specific report template', async () => {
           const newTemplate = {
                 template_name: "PRISMA Template",
                 template_type: "systematic review",
               template_structure: "{}"
           };
         const createdTemplate = await request(app)
            .post('/reports/templates')
            .set('Authorization', 'Bearer test-token')
              .send(newTemplate)
            .expect(201);
         const response = await request(app)
            .delete(`/reports/templates/${createdTemplate.body.template_id}`)
             .set('Authorization', 'Bearer test-token')
           .expect(200);
         expect(response.body).toHaveProperty('message', 'Report template deleted successfully.');
      const [template] = await pool.query('SELECT * from report_templates WHERE template_id = ?', [createdTemplate.body.template_id])
        expect(template.length).toBe(0)
    });
   it('should return 404 error when deleting a non-existing report template', async () => {
       const response = await request(app)
            .delete(`/reports/templates/non-existing-template`)
            .set('Authorization', 'Bearer test-token')
            .expect(404);
        expect(response.body).toHaveProperty('message', 'Report template not found.')
  });
   it('should create a new manuscript template', async () => {
      const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
        };
        const response = await request(app)
            .post('/manuscripts/templates')
             .set('Authorization', 'Bearer test-token')
            .send(newTemplate)
            .expect(201);
       expect(response.body).toHaveProperty('template_id');
        expect(response.body).toHaveProperty('template_name', newTemplate.template_name);
        const [template] = await pool.query('SELECT * from manuscript_templates WHERE template_id = ?', [response.body.template_id])
        expect(template.length).toBe(1)
        expect(template[0]).toHaveProperty('template_name', newTemplate.template_name)
   });
  it('should return 400 error if template name or structure are missing during manuscript template creation', async () => {
       const response = await request(app)
           .post('/manuscripts/templates')
             .set('Authorization', 'Bearer test-token')
              .send({})
            .expect(400);
        expect(response.body).toHaveProperty('message', 'Template name and structure are required')
    });
 it('should fetch all manuscript templates', async () => {
          const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
          };
      await request(app)
            .post('/manuscripts/templates')
             .set('Authorization', 'Bearer test-token')
            .send(newTemplate)
            .expect(201);
      const response = await request(app)
            .get('/manuscripts/templates')
           .set('Authorization', 'Bearer test-token')
            .expect(200);
       expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('template_name', newTemplate.template_name);
    });
 it('should create a new manuscript', async () => {
     const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
          };
     const createTemplate =  await request(app)
            .post('/manuscripts/templates')
             .set('Authorization', 'Bearer test-token')
            .send(newTemplate)
           .expect(201);
      const newManuscript = {
                project_id: 'test-project-id',
                template_id: createTemplate.body.template_id
            };
       const response = await request(app)
            .post('/manuscripts')
             .set('Authorization', 'Bearer test-token')
           .send(newManuscript)
          .expect(201);
        expect(response.body).toHaveProperty('manuscript_id');
         expect(response.body).toHaveProperty('project_id', newManuscript.project_id);
        expect(response.body).toHaveProperty('template_id', newManuscript.template_id);
     const [manuscript] = await pool.query('SELECT * from manuscripts WHERE manuscript_id = ?', [response.body.manuscript_id])
       expect(manuscript.length).toBe(1)
      expect(manuscript[0]).toHaveProperty('project_id', newManuscript.project_id)
        expect(manuscript[0]).toHaveProperty('template_id', newManuscript.template_id)
   });
  it('should return 400 error if project id or template id are missing during manuscript creation', async () => {
       const response = await request(app)
          .post('/manuscripts')
           .set('Authorization', 'Bearer test-token')
           .send({})
          .expect(400);
        expect(response.body).toHaveProperty('message', 'Project id and template id are required.')
  });
 it('should fetch a specific manuscript', async () => {
       const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
          };
     const createTemplate = await request(app)
            .post('/manuscripts/templates')
             .set('Authorization', 'Bearer test-token')
            .send(newTemplate)
           .expect(201);
       const newManuscript = {
             project_id: 'test-project-id',
             template_id: createTemplate.body.template_id,
             content: "{}"
         };
      const createdManuscript = await request(app)
             .post('/manuscripts')
            .set('Authorization', 'Bearer test-token')
            .send(newManuscript)
             .expect(201);
       const response = await request(app)
           .get(`/manuscripts/${createdManuscript.body.manuscript_id}`)
            .set('Authorization', 'Bearer test-token')
           .expect(200);
        expect(response.body).toHaveProperty('manuscript_id', createdManuscript.body.manuscript_id);
       expect(response.body).toHaveProperty('project_id', newManuscript.project_id);
        expect(response.body).toHaveProperty('template_id', newManuscript.template_id);
         expect(response.body).toHaveProperty('content', newManuscript.content);
 });
 it('should return 404 error if manuscript is not found', async () => {
        const response = await request(app)
            .get(`/manuscripts/non-existing-manuscript`)
              .set('Authorization', 'Bearer test-token')
            .expect(404);
        expect(response.body).toHaveProperty('message', 'Manuscript not found.')
   });
  it('should update the content of a specific manuscript', async () => {
    const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
          };
     const createTemplate =  await request(app)
            .post('/manuscripts/templates')
             .set('Authorization', 'Bearer test-token')
           .send(newTemplate)
           .expect(201);
    const newManuscript = {
           project_id: 'test-project-id',
           template_id: createTemplate.body.template_id,
          content: "{}"
      };
    const createdManuscript = await request(app)
          .post('/manuscripts')
         .set('Authorization', 'Bearer test-token')
         .send(newManuscript)
        .expect(201);
         const updatedContent = {
             content: '{"author":"john doe"}'
         }
     const response = await request(app)
         .put(`/manuscripts/${createdManuscript.body.manuscript_id}`)
         .set('Authorization', 'Bearer test-token')
          .send(updatedContent)
         .expect(200);
      expect(response.body).toHaveProperty('manuscript_id', createdManuscript.body.manuscript_id);
        expect(response.body).toHaveProperty('content', updatedContent.content);
      const [manuscript] = await pool.query('SELECT * from manuscripts WHERE manuscript_id = ?', [createdManuscript.body.manuscript_id])
     expect(manuscript[0]).toHaveProperty('content', updatedContent.content)
  });

  it('should return 404 error if a manuscript is not found when updating it', async () => {
    const updatedContent = {
             content: '{"author":"john doe"}'
         }
      const response = await request(app)
          .put(`/manuscripts/non-existing-manuscript`)
            .set('Authorization', 'Bearer test-token')
          .send(updatedContent)
            .expect(404);
       expect(response.body).toHaveProperty('message', 'Manuscript not found.')
   });

   it('should delete a specific manuscript', async () => {
       const newTemplate = {
           template_name: "Original Article Template",
          template_structure: "{}"
      };
       const createTemplate =  await request(app)
              .post('/manuscripts/templates')
               .set('Authorization', 'Bearer test-token')
             .send(newTemplate)
               .expect(201);
       const newManuscript = {
            project_id: 'test-project-id',
            template_id: createTemplate.body.template_id,
           content: "{}"
      };
      const createdManuscript = await request(app)
           .post('/manuscripts')
           .set('Authorization', 'Bearer test-token')
            .send(newManuscript)
           .expect(201);
      const response = await request(app)
             .delete(`/manuscripts/${createdManuscript.body.manuscript_id}`)
           .set('Authorization', 'Bearer test-token')
           .expect(200);
      expect(response.body).toHaveProperty('message', 'Manuscript deleted successfully.');
       const [manuscript] = await pool.query('SELECT * from manuscripts WHERE manuscript_id = ?', [createdManuscript.body.manuscript_id])
        expect(manuscript.length).toBe(0)
  });
 it('should return 404 error when deleting a non existing manuscript', async () => {
        const response = await request(app)
            .delete(`/manuscripts/non-existing-manuscript`)
            .set('Authorization', 'Bearer test-token')
           .expect(404);
        expect(response.body).toHaveProperty('message', 'Manuscript not found.')
    });
 it('should fetch a specific manuscript template', async () => {
      const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
      };
    const createdTemplate = await request(app)
         .post('/manuscripts/templates')
          .set('Authorization', 'Bearer test-token')
          .send(newTemplate)
         .expect(201);
      const response = await request(app)
         .get(`/manuscripts/templates/${createdTemplate.body.template_id}`)
          .set('Authorization', 'Bearer test-token')
         .expect(200);
       expect(response.body).toHaveProperty('template_id', createdTemplate.body.template_id);
         expect(response.body).toHaveProperty('template_name', newTemplate.template_name);
     });

  it('should return 404 error if manuscript template is not found', async () => {
      const response = await request(app)
            .get(`/manuscripts/templates/non-existing-template`)
           .set('Authorization', 'Bearer test-token')
           .expect(404);
        expect(response.body).toHaveProperty('message', 'Manuscript template not found.')
   });
     it('should update a specific manuscript template', async () => {
       const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
        };
       const createdTemplate = await request(app)
          .post('/manuscripts/templates')
           .set('Authorization', 'Bearer test-token')
          .send(newTemplate)
           .expect(201);
       const updatedTemplate = {
                 template_name: "New Original Article Template",
               template_structure: "{}"
          };
      const response = await request(app)
           .put(`/manuscripts/templates/${createdTemplate.body.template_id}`)
            .set('Authorization', 'Bearer test-token')
           .send(updatedTemplate)
            .expect(200);
      expect(response.body).toHaveProperty('template_id', createdTemplate.body.template_id);
        expect(response.body).toHaveProperty('template_name', updatedTemplate.template_name);
      const [template] = await pool.query('SELECT * from manuscript_templates WHERE template_id = ?', [createdTemplate.body.template_id]);
        expect(template[0]).toHaveProperty('template_name', updatedTemplate.template_name)
   });
    it('should return 404 if manuscript template is not found on update', async () => {
           const updatedTemplate = {
                 template_name: "New Original Article Template",
               template_structure: "{}"
           };
        const response = await request(app)
            .put(`/manuscripts/templates/non-existing-template`)
            .set('Authorization', 'Bearer test-token')
              .send(updatedTemplate)
            .expect(404);
         expect(response.body).toHaveProperty('message', 'Manuscript template not found.')
  });

  it('should delete a specific manuscript template', async () => {
     const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
        };
      const createdTemplate = await request(app)
           .post('/manuscripts/templates')
           .set('Authorization', 'Bearer test-token')
           .send(newTemplate)
          .expect(201);
    const response = await request(app)
           .delete(`/manuscripts/templates/${createdTemplate.body.template_id}`)
           .set('Authorization', 'Bearer test-token')
           .expect(200);
       expect(response.body).toHaveProperty('message', 'Manuscript template deleted successfully.');
      const [template] = await pool.query('SELECT * from manuscript_templates WHERE template_id = ?', [createdTemplate.body.template_id]);
         expect(template.length).toBe(0);
  });
 it('should return 404 if trying to delete a non-existing manuscript template', async () => {
        const response = await request(app)
            .delete(`/manuscripts/templates/non-existing-template`)
           .set('Authorization', 'Bearer test-token')
           .expect(404);
          expect(response.body).toHaveProperty('message', 'Manuscript template not found.');
 });

  it('should return a PDF content for report', async () => {
        const newTemplate = {
                template_name: "PRISMA Template",
                template_type: "systematic review",
                template_structure: "{}"
        };
          const createTemplate = await request(app)
                .post('/reports/templates')
               .set('Authorization', 'Bearer test-token')
                  .send(newTemplate)
                .expect(201);
          const newReport = {
               project_id: 'test-project-id',
             template_id: createTemplate.body.template_id
         };
          const createdReport = await request(app)
                .post('/reports')
               .set('Authorization', 'Bearer test-token')
                  .send(newReport)
                .expect(201);

         const response = await request(app)
           .get(`/reports/${createdReport.body.report_id}/export/pdf`)
            .set('Authorization', 'Bearer test-token')
           .expect(200);
         expect(response.text).toEqual('PDF file content is here')

    });
   it('should return a word content for report', async () => {
           const newTemplate = {
                template_name: "PRISMA Template",
                template_type: "systematic review",
                template_structure: "{}"
            };
          const createTemplate = await request(app)
                .post('/reports/templates')
              .set('Authorization', 'Bearer test-token')
                .send(newTemplate)
               .expect(201);
         const newReport = {
                project_id: 'test-project-id',
                template_id: createTemplate.body.template_id
           };
          const createdReport = await request(app)
                 .post('/reports')
               .set('Authorization', 'Bearer test-token')
                 .send(newReport)
                .expect(201);

        const response = await request(app)
            .get(`/reports/${createdReport.body.report_id}/export/word`)
           .set('Authorization', 'Bearer test-token')
           .expect(200);
        expect(response.text).toEqual('Word file content is here');
   });

   it('should return a excel content for report', async () => {
           const newTemplate = {
                 template_name: "PRISMA Template",
                template_type: "systematic review",
                template_structure: "{}"
            };
        const createTemplate =  await request(app)
                .post('/reports/templates')
                 .set('Authorization', 'Bearer test-token')
                .send(newTemplate)
                .expect(201);
         const newReport = {
                project_id: 'test-project-id',
                template_id: createTemplate.body.template_id
           };
        const createdReport =  await request(app)
                 .post('/reports')
               .set('Authorization', 'Bearer test-token')
                 .send(newReport)
               .expect(201);
        const response = await request(app)
            .get(`/reports/${createdReport.body.report_id}/export/excel`)
            .set('Authorization', 'Bearer test-token')
            .expect(200);
         expect(response.text).toEqual('Excel file content is here');
    });
 it('should return a csv content for report', async () => {
         const newTemplate = {
            template_name: "PRISMA Template",
            template_type: "systematic review",
           template_structure: "{}"
        };
       const createTemplate = await request(app)
              .post('/reports/templates')
             .set('Authorization', 'Bearer test-token')
             .send(newTemplate)
              .expect(201);
      const newReport = {
           project_id: 'test-project-id',
           template_id: createTemplate.body.template_id
        };
    const createdReport = await request(app)
            .post('/reports')
             .set('Authorization', 'Bearer test-token')
              .send(newReport)
             .expect(201);
       const response = await request(app)
            .get(`/reports/${createdReport.body.report_id}/export/csv`)
             .set('Authorization', 'Bearer test-token')
           .expect(200);
         expect(response.text).toEqual('CSV file content is here')
 });
   it('should return a pdf content for manuscript', async () => {
        const newTemplate = {
           template_name: "Original Article Template",
            template_structure: "{}"
       };
        const createTemplate = await request(app)
            .post('/manuscripts/templates')
             .set('Authorization', 'Bearer test-token')
            .send(newTemplate)
            .expect(201);
       const newManuscript = {
            project_id: 'test-project-id',
            template_id: createTemplate.body.template_id,
           content: "{}"
          };
       const createdManuscript = await request(app)
             .post('/manuscripts')
              .set('Authorization', 'Bearer test-token')
            .send(newManuscript)
           .expect(201);
      const response = await request(app)
            .get(`/manuscripts/${createdManuscript.body.manuscript_id}/export/pdf`)
            .set('Authorization', 'Bearer test-token')
            .expect(200);
        expect(response.text).toEqual('PDF file content is here')
    });

  it('should return a word content for manuscript', async () => {
       const newTemplate = {
            template_name: "Original Article Template",
           template_structure: "{}"
        };
        const createTemplate = await request(app)
           .post('/manuscripts/templates')
            .set('Authorization', 'Bearer test-token')
             .send(newTemplate)
            .expect(201);
       const newManuscript = {
            project_id: 'test-project-id',
            template_id: createTemplate.body.template_id,
           content: "{}"
        };
      const createdManuscript = await request(app)
            .post('/manuscripts')
            .set('Authorization', 'Bearer test-token')
           .send(newManuscript)
            .expect(201);
        const response = await request(app)
            .get(`/manuscripts/${createdManuscript.body.manuscript_id}/export/word`)
          .set('Authorization', 'Bearer test-token')
           .expect(200);
       expect(response.text).toEqual('Word file content is here')
    });

    it('should export a visualization in png format', async () => {
         const response = await request(app)
            .get(`/visualization/export?format=PNG`)
           .set('Authorization', 'Bearer test-token')
            .expect(200);
         expect(response.text).toEqual('Visualization exported successfully inPNG format');
   });
    it('should return 400 error for visualization export if format parameter is missing', async () => {
       const response = await request(app)
            .get(`/visualization/export`)
           .set('Authorization', 'Bearer test-token')
             .expect(400);
      expect(response.body).toHaveProperty('message', 'Format is required')
  });
  it('should return a error if the visualization format is not valid', async () => {
          const response = await request(app)
            .get(`/visualization/export?format=invalidformat`)
           .set('Authorization', 'Bearer test-token')
            .expect(400);
        expect(response.body).toHaveProperty('message', 'Format is required')
     });
    it('should generate a default report content', async () => {
        const newTemplate = {
              template_name: "PRISMA Template",
              template_type: "systematic review",
            template_structure: "{}"
        };
      const createTemplate = await request(app)
           .post('/reports/templates')
            .set('Authorization', 'Bearer test-token')
             .send(newTemplate)
            .expect(201);
        const newReport = {
               project_id: 'test-project-id',
               template_id: createTemplate.body.template_id
           };
          const createdReport = await request(app)
                .post('/reports')
                .set('Authorization', 'Bearer test-token')
                 .send(newReport)
                .expect(201);
        const response = await request(app)
            .post(`/reports/${createdReport.body.report_id}/generate-content`)
            .set('Authorization', 'Bearer test-token')
           .expect(200);
        expect(response.body).toHaveProperty('report_content', 'report content generated successfully');
      });

  });
  
  
  