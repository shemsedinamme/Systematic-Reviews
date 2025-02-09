const request = require('supertest');
const app = require('../index');
const pool = require('../database');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

describe('Data Extraction Routes', () => {
    let authToken;
    let testProjectId;
    let testFormId;
    let testTemplateId;
    beforeAll(async () => {
        const user =  await pool.query(
            'INSERT INTO users (user_id, username, email, hashed_password, role) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), 'testuser', 'testuser@example.com', '$2b$10$Qz2q.515r/0yq2n5w2Qxgu.gTz2jLqK/o2t4W4Q1fC0U5gQ32oQ.', 'reviewer']
        )
        const project = await pool.query(
            'INSERT INTO projects (project_id, title, description, start_date, end_date, creation_date) VALUES (?, ?, ?, ?, ?, NOW()) ',
             [uuidv4(), 'Test Project', 'This is a test project', '2024-01-01', '2024-12-31']
        )
        testProjectId = project[0].insertId;

         const template = await pool.query(
            'INSERT INTO templates (template_id, template_name, template_description) VALUES (?, ?, ?) ',
            [uuidv4(), 'Test Template', 'This is a test template']
        )
        testTemplateId = template[0].insertId;
      const response = await request(app)
          .post('/login')
          .send({ usernameEmail: 'testuser', password: 'Password123' });
      authToken = response.body.token;
    });

    afterAll(async () => {
        // Clean up
        await pool.query('DELETE from users WHERE username = ?', ['testuser']);
         await pool.query('DELETE from projects WHERE project_id = ?', [testProjectId]);
          await pool.query('DELETE from templates WHERE template_id = ?', [testTemplateId]);
    })
  // Test cases for /extraction-forms
   describe('GET /extraction-forms', () => {
        it('should fetch extraction forms', async () => {
            const response = await request(app)
               .get(`/extraction-forms?project_id=${testProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();
        });
      it('should not fetch extraction forms if project id is invalid', async () => {
          const response = await request(app)
              .get('/extraction-forms?project_id=invalid-id')
              .set('Authorization', `Bearer ${authToken}`);
            expect(response.statusCode).toBe(400);
              expect(response.body).toHaveProperty('message', 'Invalid project id format');
       });
    });
    describe('POST /extraction-forms', () => {
       it('should create a new data extraction form.', async () => {
           const response = await request(app)
               .post('/extraction-forms')
                .set('Authorization', `Bearer ${authToken}`)
               .send({
                   form_name: 'test form',
                 form_description: 'test description',
                 project_id: testProjectId
              });
           expect(response.statusCode).toBe(201);
          expect(response.body).toHaveProperty('form_id')
        });
       it('should not create a new data extraction form if project id is missing', async () => {
           const response = await request(app)
                .post('/extraction-forms')
               .set('Authorization', `Bearer ${authToken}`)
               .send({
                form_name: 'test form',
               form_description: 'test description',
               });
           expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message', 'Project id is required');
        });
     });
    describe('GET /extraction-forms/:form_id', () => {
         it('should fetch a specific extraction form details', async () => {
           const createResponse = await request(app)
                .post('/extraction-forms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                  form_name: 'test form',
                  form_description: 'test description',
                 project_id: testProjectId
                });
          const formId = createResponse.body.form_id;
            const response = await request(app)
                 .get(`/extraction-forms/${formId}`)
               .set('Authorization', `Bearer ${authToken}`)
           expect(response.statusCode).toBe(200);
          expect(response.body).toHaveProperty('form_id');
             expect(response.body).toHaveProperty('form_name', 'test form');
        });
        it('should not fetch the form if the id is invalid.', async () => {
             const response = await request(app)
                 .get(`/extraction-forms/invalid-uuid`)
               .set('Authorization', `Bearer ${authToken}`)
              expect(response.statusCode).toBe(400);
              expect(response.body).toHaveProperty('message', 'Invalid form id format');
         });
         it('should not fetch the form if the id is not found.', async () => {
           const response = await request(app)
               .get(`/extraction-forms/${uuidv4()}`)
               .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('message', 'Form not found.');
       });
   });
    describe('PUT /extraction-forms/:form_id', () => {
      it('should update a specific form details.', async () => {
          const createResponse = await request(app)
              .post('/extraction-forms')
             .set('Authorization', `Bearer ${authToken}`)
            .send({
                form_name: 'test form',
                form_description: 'test description',
                project_id: testProjectId
           });
            const formId = createResponse.body.form_id;
           const response = await request(app)
                .put(`/extraction-forms/${formId}`)
               .set('Authorization', `Bearer ${authToken}`)
              .send({
                  form_name: 'updated form name',
               form_description: 'updated description'
              })
          expect(response.statusCode).toBe(200);
           expect(response.body).toHaveProperty('form_id', formId);
             expect(response.body).toHaveProperty('form_name', 'updated form name');
               expect(response.body).toHaveProperty('form_description', 'updated description');
        });

       it('should not update a form if the form id does not exist', async () => {
          const response = await request(app)
                .put(`/extraction-forms/${uuidv4()}`)
                .set('Authorization', `Bearer ${authToken}`)
              .send({
                  form_name: 'updated form name',
                   form_description: 'updated description'
              })
            expect(response.statusCode).toBe(404);
             expect(response.body).toHaveProperty('message','Form not found.');
       });
    });
    describe('DELETE /extraction-forms/:form_id', () => {
        it('should delete a specific extraction form', async () => {
          const createResponse = await request(app)
                .post('/extraction-forms')
                 .set('Authorization', `Bearer ${authToken}`)
              .send({
                    form_name: 'test form',
                   form_description: 'test description',
                     project_id: testProjectId
                 });
              const formId = createResponse.body.form_id;
            const response = await request(app)
                 .delete(`/extraction-forms/${formId}`)
                .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(200);
              expect(response.body).toHaveProperty('message', 'Extraction form deleted successfully.');
         });
       it('should not delete a form with invalid form id', async () => {
            const response = await request(app)
               .delete(`/extraction-forms/invalid-uuid`)
                .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(400);
               expect(response.body).toHaveProperty('message', 'Invalid form id format');
       });
        it('should not delete a form if id not found.', async () => {
           const response = await request(app)
               .delete(`/extraction-forms/${uuidv4()}`)
                .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('message','Form not found.');
        });
    });
   //Test cases for /extraction-forms/templates
      describe('GET /extraction-forms/templates', () => {
        it('should fetch extraction form templates', async () => {
          const response = await request(app)
                .get('/extraction-forms/templates')
                .set('Authorization', `Bearer ${authToken}`)
                expect(response.statusCode).toBe(200);
                expect(Array.isArray(response.body)).toBeTruthy();
       });
      });
      describe('POST /extraction-forms/templates', () => {
        it('should create a new data extraction template.', async () => {
         const response = await request(app)
             .post('/extraction-forms/templates')
              .set('Authorization', `Bearer ${authToken}`)
             .send({
                    template_name: 'test template',
                    template_description: 'test description',
                 });
            expect(response.statusCode).toBe(201);
           expect(response.body).toHaveProperty('template_id')
             expect(response.body).toHaveProperty('template_name','test template')
        });
      it('should not create a new data extraction template if name is not provided', async () => {
          const response = await request(app)
                .post('/extraction-forms/templates')
               .set('Authorization', `Bearer ${authToken}`)
            .send({
                template_description: 'test description',
              });
           expect(response.statusCode).toBe(400);
           expect(response.body).toHaveProperty('message', 'Template name is required, and must be a string not more than 255 characters.');
        });
    });
     describe('GET /extraction-forms/templates/:template_id', () => {
        it('should fetch a specific template', async () => {
             const createResponse = await request(app)
                 .post('/extraction-forms/templates')
                   .set('Authorization', `Bearer ${authToken}`)
                .send({
                      template_name: 'test template',
                    template_description: 'test description',
                 });
            const templateId = createResponse.body.template_id;
            const response = await request(app)
                 .get(`/extraction-forms/templates/${templateId}`)
               .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(200);
             expect(response.body).toHaveProperty('template_id', templateId);
             expect(response.body).toHaveProperty('template_name','test template');
        });
       it('should not fetch a template if the template id is invalid.', async () => {
           const response = await request(app)
                .get(`/extraction-forms/templates/invalid-uuid`)
                .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(400);
           expect(response.body).toHaveProperty('message','Invalid template id format');
       });
      it('should not fetch a template if the template id is not found.', async () => {
         const response = await request(app)
            .get(`/extraction-forms/templates/${uuidv4()}`)
               .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(404);
          expect(response.body).toHaveProperty('message', 'Template not found.');
       });
   });
    describe('PUT /extraction-forms/templates/:template_id', () => {
         it('should update a form template', async () => {
          const createResponse = await request(app)
                .post('/extraction-forms/templates')
                  .set('Authorization', `Bearer ${authToken}`)
             .send({
                      template_name: 'test template',
                       template_description: 'test description',
                });
           const templateId = createResponse.body.template_id;
            const response = await request(app)
              .put(`/extraction-forms/templates/${templateId}`)
                .set('Authorization', `Bearer ${authToken}`)
             .send({
                   template_name: 'updated template name',
                   template_description: 'updated template description'
                })
            expect(response.statusCode).toBe(200);
               expect(response.body).toHaveProperty('template_id', templateId);
              expect(response.body).toHaveProperty('template_name', 'updated template name');
         });

       it('should not update a template if template id is invalid.', async () => {
          const response = await request(app)
              .put(`/extraction-forms/templates/invalid-uuid`)
              .set('Authorization', `Bearer ${authToken}`)
             .send({
                     template_name: 'updated template name',
                    template_description: 'updated template description'
               });
            expect(response.statusCode).toBe(400);
             expect(response.body).toHaveProperty('message','Invalid template id format');
        });
        it('should not update a template if template id does not exists', async () => {
           const response = await request(app)
                .put(`/extraction-forms/templates/${uuidv4()}`)
               .set('Authorization', `Bearer ${authToken}`)
            .send({
                    template_name: 'updated template name',
                    template_description: 'updated template description'
                });
            expect(response.statusCode).toBe(404);
           expect(response.body).toHaveProperty('message','Template not found.');
       });
    });
    describe('DELETE /extraction-forms/templates/:template_id', () => {
         it('should delete a specific template', async () => {
             const createResponse = await request(app)
                 .post('/extraction-forms/templates')
                   .set('Authorization', `Bearer ${authToken}`)
                .send({
                      template_name: 'test template',
                     template_description: 'test description',
                });
             const templateId = createResponse.body.template_id;
              const response = await request(app)
               .delete(`/extraction-forms/templates/${templateId}`)
                 .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(200);
              expect(response.body).toHaveProperty('message','Extraction form template deleted successfully.');
        });
          it('should not delete a template with invalid id', async () => {
               const response = await request(app)
                    .delete('/extraction-forms/templates/invalid-uuid')
                  .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message', 'Invalid template id format');
          });
         it('should not delete a template with id that is not found', async () => {
           const response = await request(app)
              .delete(`/extraction-forms/templates/${uuidv4()}`)
             .set('Authorization', `Bearer ${authToken}`)
          expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('message', 'Template not found.');
        });
    });

    //Test cases for /extraction-forms/:form_id/fields
   describe('GET /extraction-forms/:form_id/fields', () => {
       it('should fetch fields of a specific form.', async () => {
          const createResponse = await request(app)
              .post('/extraction-forms')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                 form_name: 'test form',
                  form_description: 'test description',
                  project_id: testProjectId
                });
             const formId = createResponse.body.form_id;
          const response = await request(app)
                .get(`/extraction-forms/${formId}/fields`)
               .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(200);
           expect(Array.isArray(response.body)).toBeTruthy();
         });
        it('should not fetch a form field if the form id is invalid', async () => {
             const response = await request(app)
                .get(`/extraction-forms/invalid-uuid/fields`)
                  .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(400);
              expect(response.body).toHaveProperty('message', 'Invalid form id format');
         });
         it('should not fetch a form field if the form does not exists', async () => {
             const response = await request(app)
                 .get(`/extraction-forms/${uuidv4()}/fields`)
                .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(404);
             expect(response.body).toHaveProperty('message', 'Form not found.');
       });
   });

    describe('POST /extraction-forms/:form_id/fields', () => {
        it('should add new field to specific form', async () => {
          const createResponse = await request(app)
             .post('/extraction-forms')
                .set('Authorization', `Bearer ${authToken}`)
             .send({
                  form_name: 'test form',
                    form_description: 'test description',
                     project_id: testProjectId
                });
            const formId = createResponse.body.form_id;
            const response = await request(app)
                .post(`/extraction-forms/${formId}/fields`)
                .set('Authorization', `Bearer ${authToken}`)
             .send({
                 field_label: 'test field',
                    field_type: 'text'
                 })
            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('field_id');
             expect(response.body).toHaveProperty('field_label', 'test field');
              expect(response.body).toHaveProperty('field_type', 'text');
         });
         it('should not add field if form id is invalid', async () => {
             const response = await request(app)
                 .post(`/extraction-forms/invalid-uuid/fields`)
                .set('Authorization', `Bearer ${authToken}`)
                 .send({
                  field_label: 'test field',
                    field_type: 'text'
                 })
              expect(response.statusCode).toBe(400);
                expect(response.body).toHaveProperty('message', 'Invalid form id format');
          });
        it('should not add new field if required parameters are missing', async () => {
          const createResponse = await request(app)
                .post('/extraction-forms')
               .set('Authorization', `Bearer ${authToken}`)
            .send({
                   form_name: 'test form',
                  form_description: 'test description',
                   project_id: testProjectId
               });
         const formId = createResponse.body.form_id;
             const response = await request(app)
                 .post(`/extraction-forms/${formId}/fields`)
               .set('Authorization', `Bearer ${authToken}`)
            .send({
                   })
           expect(response.statusCode).toBe(400);
             expect(response.body).toHaveProperty('message', 'Field type and label is required.');
        });
    });
    describe('PUT /extraction-forms/:form_id/fields/:field_id', () => {
      it('should update a field in an extraction form', async () => {
         const createResponse = await request(app)
               .post('/extraction-forms')
                 .set('Authorization', `Bearer ${authToken}`)
               .send({
                    form_name: 'test form',
                   form_description: 'test description',
                      project_id: testProjectId
                });
          const formId = createResponse.body.form_id;
           const addFieldResponse = await request(app)
               .post(`/extraction-forms/${formId}/fields`)
                .set('Authorization', `Bearer ${authToken}`)
             .send({
                 field_label: 'test field',
                  field_type: 'text'
               })
           const fieldId = addFieldResponse.body.field_id
           const response = await request(app)
               .put(`/extraction-forms/${formId}/fields/${fieldId}`)
             .set('Authorization', `Bearer ${authToken}`)
               .send({
                field_label: 'updated field',
                    field_type: 'numeric'
            })
           expect(response.statusCode).toBe(200);
              expect(response.body).toHaveProperty('field_label', 'updated field');
            expect(response.body).toHaveProperty('field_type', 'numeric');
        });
      it('should not update a field if form id is invalid', async () => {
          const response = await request(app)
               .put(`/extraction-forms/invalid-uuid/fields/${uuidv4()}`)
               .set('Authorization', `Bearer ${authToken}`)
                .send({
                    field_label: 'updated field',
                   field_type: 'numeric'
               });
           expect(response.statusCode).toBe(400);
           expect(response.body).toHaveProperty('message','Invalid form id format');
        });
         it('should not update a field if field id is invalid', async () => {
            const createResponse = await request(app)
              .post('/extraction-forms')
                .set('Authorization', `Bearer ${authToken}`)
             .send({
                  form_name: 'test form',
                 form_description: 'test description',
                   project_id: testProjectId
              });
            const formId = createResponse.body.form_id;
           const response = await request(app)
                .put(`/extraction-forms/${formId}/fields/invalid-uuid`)
                .set('Authorization', `Bearer ${authToken}`)
                 .send({
                   field_label: 'updated field',
                    field_type: 'numeric'
                })
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message', 'Invalid field id format');
         });
         it('should not update a field if field or form does not exists', async () => {
            const response = await request(app)
                .put(`/extraction-forms/${uuidv4()}/fields/${uuidv4()}`)
                .set('Authorization', `Bearer ${authToken}`)
            .send({
                    field_label: 'updated field',
                    field_type: 'numeric'
                })
             expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('message', 'Form or field not found.');
         });
    });
   describe('DELETE /extraction-forms/:form_id/fields/:field_id', () => {
        it('should delete a specific field of a form', async () => {
            const createResponse = await request(app)
                 .post('/extraction-forms')
                .set('Authorization', `Bearer ${authToken}`)
              .send({
                    form_name: 'test form',
                   form_description: 'test description',
                    project_id: testProjectId
             });
           const formId = createResponse.body.form_id;
           const addFieldResponse = await request(app)
               .post(`/extraction-forms/${formId}/fields`)
                .set('Authorization', `Bearer ${authToken}`)
             .send({
                 field_label: 'test field',
                    field_type: 'text'
               });
          const fieldId = addFieldResponse.body.field_id
             const response = await request(app)
                .delete(`/extraction-forms/${formId}/fields/${fieldId}`)
               .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(200);
             expect(response.body).toHaveProperty('message', 'Form field deleted successfully.');
        });
       it('should not delete a field with invalid id', async () => {
           const response = await request(app)
                .delete(`/extraction-forms/invalid-uuid/fields/${uuidv4()}`)
               .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(400);
             expect(response.body).toHaveProperty('message', 'Invalid form or field id.');
       });
        it('should not delete a field if form or field id is not found', async () => {
              const response = await request(app)
                  .delete(`/extraction-forms/${uuidv4()}/fields/${uuidv4()}`)
                 .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('message','Form or field not found.');
        });
   });
});
