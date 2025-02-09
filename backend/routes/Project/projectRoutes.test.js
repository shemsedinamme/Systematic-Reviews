const request = require('supertest');
const app = require('../index'); // Assuming your main app file is in the root
const pool = require('../database');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { mockDbResponse } = require('./testHelper');
const Project = require('../models/project.model');
const ProjectMetadata = require('../models/projectMetadata.model');
const ProjectLifecycle = require('../models/projectLifecycle.model');
const ProjectFile = require('../models/projectFile.model');
const ProjectComment = require('../models/projectComment.model');
const ProjectShare = require('../models/projectShare.model');


describe('Project Routes', () => {
    let authToken; // Declare authToken at a higher scope

    beforeAll(async () => {
        // Create a test user and get the authentication token
        const user =  await pool.query(
            'INSERT INTO users (user_id, username, email, hashed_password, role) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), 'testuser', 'testuser@example.com', '$2b$10$Qz2q.515r/0yq2n5w2Qxgu.gTz2jLqK/o2t4W4Q1fC0U5gQ32oQ.', 'admin']
        )
        const response = await request(app)
            .post('/login')
            .send({ usernameEmail: 'testuser', password: 'Password123' });
        authToken = response.body.token;
    });

    afterAll(async () => {
        // Clean up
         await pool.query('DELETE from users WHERE username = ?', ['testuser']);
    })

   describe('Project Creation and Search Tests', () => {
        it('should create a new project successfully', async () => {
           pool.query = mockDbResponse([[], { affectedRows: 1 }], 2);
            const res = await request(app)
                .post('/projects')
                .set('Authorization', `Bearer ${authToken}`)
                 .send({
                    title: 'Test Project',
                   description: 'This is a test project',
                    start_date: '2024-01-01',
                   end_date: '2024-12-31',
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('project_id');
            expect(res.body).toHaveProperty('title', 'Test Project');
            expect(res.body).toHaveProperty('description', 'This is a test project');
           expect(res.body).toHaveProperty('start_date', '2024-01-01');
          expect(res.body).toHaveProperty('end_date', '2024-12-31');
        });
    it('should return error if title is missing', async () => {
        const res = await request(app)
            .post('/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                description: 'This is a test project',
                start_date: '2024-01-01',
                end_date: '2024-12-31',
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Title is required and must be a string not more than 255 characters.');
    });
    it('should return error if description is missing', async () => {
           const res = await request(app)
              .post('/projects')
             .set('Authorization', `Bearer ${authToken}`)
             .send({
                title: 'Test Project',
                start_date: '2024-01-01',
                end_date: '2024-12-31',
             });
            expect(res.status).toBe(400);
          expect(res.body.message).toBe('Description is required and must be a string not more than 1000 characters.');
       });
    it('should return error if start_date is missing', async () => {
        const res = await request(app)
            .post('/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'Test Project',
                description: 'This is a test project',
                end_date: '2024-12-31',
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Start date is required and must be a valid date in the format YYYY-MM-DD.');
    });
     it('should return error if end_date is missing', async () => {
            const res = await request(app)
                 .post('/projects')
                 .set('Authorization', `Bearer ${authToken}`)
               .send({
                title: 'Test Project',
                 description: 'This is a test project',
                  start_date: '2024-01-01',
             });
           expect(res.status).toBe(400);
           expect(res.body.message).toBe('End date is required and must be a valid date in the format YYYY-MM-DD.');
        });
     it('should return error if start_date is in wrong format', async () => {
            const res = await request(app)
              .post('/projects')
             .set('Authorization', `Bearer ${authToken}`)
            .send({
                 title: 'Test Project',
                  description: 'This is a test project',
                  start_date: '2024/01/01',
                 end_date: '2024-12-31',
               });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Start date is required and must be a valid date in the format YYYY-MM-DD.');
         });
         it('should return error if end_date is in wrong format', async () => {
              const res = await request(app)
                   .post('/projects')
                   .set('Authorization', `Bearer ${authToken}`)
                .send({
                   title: 'Test Project',
                     description: 'This is a test project',
                     start_date: '2024-01-01',
                    end_date: '2024/12/31',
                });
            expect(res.status).toBe(400);
           expect(res.body.message).toBe('End date is required and must be a valid date in the format YYYY-MM-DD.');
       });
    });
      describe('GET /projects/search', () => {
          it('should fetch all projects based on search query', async () => {
               const project = { project_id: '123', title: 'Test Project' }
               pool.query = mockDbResponse([[project]]);
              const res = await request(app)
                    .get('/projects/search?query=Test')
                  .set('Authorization', `Bearer ${authToken}`)
               expect(res.status).toBe(200);
               expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ project_id: '123', title: 'Test Project' })]));
           });
           it('should return 401 error if no token provided', async () => {
             const res = await request(app).get('/projects/search?query=Test');
               expect(res.status).toBe(401);
               expect(res.body.message).toBe('Access token missing.');
          });
          it('should return error if query is missing', async () => {
             const res = await request(app)
                    .get('/projects/search')
                   .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(400);
              expect(res.body.message).toBe('Search query is required, and must be a string not more than 255 characters.');
           });
     });
     describe('Project Metadata Management Tests', () => {
        describe('GET /projects/:project_id/metadata', () => {
             it('should fetch metadata for a project successfully', async () => {
                const metadata = [{ meta_id: '123', field_name: 'author', value: 'John Doe' }]
                 pool.query = mockDbResponse([[{project_id: '123'}],[metadata]])
               const res = await request(app)
                     .get('/projects/123/metadata')
                     .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
                expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ meta_id: '123', field_name: 'author', value: 'John Doe' })]));
             });
             it('should return 404 if project does not exist', async () => {
                  pool.query = mockDbResponse([[]])
                 const res = await request(app)
                      .get('/projects/123/metadata')
                      .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
               expect(res.body.message).toBe('Project with id 123 not found');
            });
             it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .get('/projects/invalid-uuid/metadata')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(400);
               expect(res.body.message).toBe('Invalid project id format');
            });
        });
      describe('POST /projects/:project_id/metadata', () => {
             it('should create new metadata successfully for the project', async () => {
                  pool.query = mockDbResponse([[{project_id: '123'}],[], [], { affectedRows: 1 }])
               const res = await request(app)
                   .post('/projects/123/metadata')
                   .set('Authorization', `Bearer ${authToken}`)
                  .send({ field_name: 'author', value: 'John Doe' });
                expect(res.status).toBe(201);
               expect(res.body).toHaveProperty('meta_id');
              expect(res.body).toHaveProperty('field_name', 'author');
              expect(res.body).toHaveProperty('value', 'John Doe');
            });
           it('should return 404 if project does not exist', async () => {
               pool.query = mockDbResponse([[]])
                const res = await request(app)
                     .post('/projects/123/metadata')
                      .set('Authorization', `Bearer ${authToken}`)
                      .send({ field_name: 'author', value: 'John Doe' });
                expect(res.status).toBe(404);
               expect(res.body.message).toBe('Project with id 123 not found');
         });
          it('should return error if metadata field name is missing', async () => {
               const res = await request(app)
                   .post('/projects/123/metadata')
                  .set('Authorization', `Bearer ${authToken}`)
                  .send({ value: 'John Doe' });
             expect(res.status).toBe(400);
              expect(res.body.message).toBe('Metadata field name is required and must be a string not more than 255 characters.');
          });
            it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .post('/projects/invalid-uuid/metadata')
                     .set('Authorization', `Bearer ${authToken}`)
                     .send({ field_name: 'author', value: 'John Doe' });
                expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid project id format');
          });
        });
       describe('PUT /projects/:project_id/metadata', () => {
             it('should update metadata for project successfully', async () => {
                const metaData = { meta_id: '123', field_name: 'author', value: 'Jane Doe' };
                 pool.query = mockDbResponse([[{project_id: '123'}], [{ meta_id: '123' }], [metaData] ]);
               const res = await request(app)
                    .put('/projects/123/metadata')
                     .set('Authorization', `Bearer ${authToken}`)
                   .send({ meta_id: '123', value: 'Jane Doe' });
                expect(res.status).toBe(200);
               expect(res.body).toHaveProperty('meta_id', '123');
              expect(res.body).toHaveProperty('field_name', 'author');
               expect(res.body).toHaveProperty('value', 'Jane Doe');
          });
         it('should return 404 if project does not exist', async () => {
            pool.query = mockDbResponse([[]]);
            const res = await request(app)
                .put('/projects/123/metadata')
              .set('Authorization', `Bearer ${authToken}`)
              .send({ meta_id: '123', value: 'Jane Doe' });
           expect(res.status).toBe(404);
            expect(res.body.message).toBe('Project with id 123 not found');
        });
         it('should return 404 if metadata not found', async () => {
            pool.query = mockDbResponse([[{project_id: '123'}],[]]);
            const res = await request(app)
               .put('/projects/123/metadata')
               .set('Authorization', `Bearer ${authToken}`)
               .send({ meta_id: '123', value: 'Jane Doe' });
            expect(res.status).toBe(404);
             expect(res.body.message).toBe('Metadata with id 123 not found for the project 123.');
       });
        it('should return error for invalid meta_id', async () => {
             const res = await request(app)
                 .put('/projects/123/metadata')
                 .set('Authorization', `Bearer ${authToken}`)
               .send({ meta_id: 'invalid-uuid', value: 'Jane Doe' });
          expect(res.status).toBe(400);
         expect(res.body.message).toBe('Metadata id is required and must be a valid uuid.');
       });
       it('should return error for missing metadata value', async () => {
         const res = await request(app)
                 .put('/projects/123/metadata')
                 .set('Authorization', `Bearer ${authToken}`)
                  .send({ meta_id: '123'});
          expect(res.status).toBe(400);
        expect(res.body.message).toBe('Metadata value is required and must be string with maximum of 1000 characters.');
       });
         it('should return error for invalid project id', async () => {
            const res = await request(app)
                .put('/projects/invalid-uuid/metadata')
                  .set('Authorization', `Bearer ${authToken}`)
                .send({ meta_id: '123', value: 'Jane Doe' });
             expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid project id format');
         });
      });
    });
       describe('Project Workflow Management Tests', () => {
         describe('GET /projects/:project_id/workflows', () => {
            it('should return workflows for the project', async () => {
             const mockWorkflowData = {
                    workflow_id: '123',
                    workflow_name: 'Default Workflow',
                     stages:[
                            {
                                stage_id: '111',
                                stage_name: 'Screening',
                                tasks: [
                                    {
                                        task_id: '111',
                                       task_name: 'Title Abstract Screening',
                                       assigned_user_id: null,
                                         due_date: null,
                                       dependencies:[]
                                    }
                                 ]
                           }
                        ]
                   };
                pool.query = mockDbResponse([[{project_id: '123'}], [{ workflow_id: '123', workflow_name: 'Default Workflow' }], [[]]]);

                const res = await request(app)
                   .get('/projects/123/workflows')
                    .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(200);
                  expect(res.body).toEqual(expect.objectContaining({
                    workflow_id: '123',
                      workflow_name: 'Default Workflow'
                    }));
            });
             it('should return 404 for workflow not found', async () => {
                 pool.query = mockDbResponse([[{project_id: '123'}],[]]);
                const res = await request(app)
                    .get('/projects/123/workflows')
                  .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
                expect(res.body.message).toBe('No workflow found for this project.');
            });
             it('should return 404 if project not found', async () => {
               pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                    .get('/projects/123/workflows')
                    .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 not found');
         });
            it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .get('/projects/invalid-uuid/workflows')
                   .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid project id format');
            });
        });
        describe('POST /projects/:project_id/workflows', () => {
             it('should create new workflow successfully', async () => {
                pool.query = mockDbResponse([[{project_id: '123'}],{ affectedRows: 1 }]);
               const res = await request(app)
                    .post('/projects/123/workflows')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ workflow_name: 'Systematic Review Workflow' });
                 expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('workflow_id');
                 expect(res.body).toHaveProperty('workflow_name', 'Systematic Review Workflow');
                 expect(res.body).toHaveProperty('project_id', '123');
            });
          it('should create new workflow successfully without workflow name', async () => {
             pool.query = mockDbResponse([[{project_id: '123'}], { affectedRows: 1 }]);
                const res = await request(app)
                    .post('/projects/123/workflows')
                  .set('Authorization', `Bearer ${authToken}`)
                  .send({});
                 expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('workflow_id');
                expect(res.body).toHaveProperty('workflow_name', 'default');
             expect(res.body).toHaveProperty('project_id', '123');
            });
           it('should return 404 if project is not found', async () => {
                 pool.query = mockDbResponse([[]]);
                const res = await request(app)
                     .post('/projects/123/workflows')
                    .set('Authorization', `Bearer ${authToken}`)
                     .send({ workflow_name: 'Systematic Review Workflow' });
                 expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 not found');
            });
            it('should return error for invalid project id', async () => {
                 const res = await request(app)
                    .post('/projects/invalid-uuid/workflows')
                     .set('Authorization', `Bearer ${authToken}`)
                   .send({ workflow_name: 'Systematic Review Workflow' });
             expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid project id format');
        });
        });
       describe('POST /workflows/:workflow_id/stages', () => {
             it('should create new stage for the workflow successfully', async () => {
                  pool.query = mockDbResponse([[{workflow_id: '123'}],{ affectedRows: 1 }]);
                const res = await request(app)
                     .post('/workflows/123/stages')
                     .set('Authorization', `Bearer ${authToken}`)
                    .send({ stage_name: 'Data Extraction' });
                expect(res.status).toBe(201);
                 expect(res.body).toHaveProperty('stage_id');
                expect(res.body).toHaveProperty('stage_name', 'Data Extraction');
            });
            it('should return 404 if workflow does not exist', async () => {
                 pool.query = mockDbResponse([[]]);
                const res = await request(app)
                     .post('/workflows/123/stages')
                    .set('Authorization', `Bearer ${authToken}`)
                     .send({ stage_name: 'Data Extraction' });
                expect(res.status).toBe(404);
              expect(res.body.message).toBe('workflow with id 123 not found');
         });
            it('should return 400 if stage_name is missing', async () => {
                const res = await request(app)
                     .post('/workflows/123/stages')
                     .set('Authorization', `Bearer ${authToken}`)
                      .send({});
                 expect(res.status).toBe(400);
               expect(res.body.message).toBe('Stage name is required, and must be a string not more than 255 characters.');
            });
            it('should return error for invalid workflow id', async () => {
                 const res = await request(app)
                     .post('/workflows/invalid-uuid/stages')
                     .set('Authorization', `Bearer ${authToken}`)
                     .send({ stage_name: 'Data Extraction' });
               expect(res.status).toBe(400);
               expect(res.body.message).toBe('Invalid workflow id format');
          });
       });
        describe('POST /stages/:stage_id/tasks', () => {
             it('should create new task for the stage successfully', async () => {
                 pool.query = mockDbResponse([[{stage_id: '123'}], { affectedRows: 1 }]);
                const res = await request(app)
                     .post('/stages/123/tasks')
                    .set('Authorization', `Bearer ${authToken}`)
                     .send({ task_name: 'Screen full text' });
                expect(res.status).toBe(201);
               expect(res.body).toHaveProperty('task_id');
                expect(res.body).toHaveProperty('task_name', 'Screen full text');
             });
             it('should return 404 if stage is not found', async () => {
                pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                     .post('/stages/123/tasks')
                    .set('Authorization', `Bearer ${authToken}`)
                     .send({ task_name: 'Screen full text' });
                 expect(res.status).toBe(404);
                 expect(res.body.message).toBe('Stage with id 123 not found');
            });
             it('should return 400 if task name is missing', async () => {
                 const res = await request(app)
                      .post('/stages/123/tasks')
                      .set('Authorization', `Bearer ${authToken}`)
                      .send({});
                 expect(res.status).toBe(400);
                expect(res.body.message).toBe('Task name is required, and must be a string not more than 255 characters.');
            });
           it('should return error for invalid stage id', async () => {
                 const res = await request(app)
                     .post('/stages/invalid-uuid/tasks')
                   .set('Authorization', `Bearer ${authToken}`)
                   .send({ task_name: 'Screen full text' });
                expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid stage id format');
           });
        });
      describe('POST /tasks/:task_id/assign', () => {
             it('should assign the task to a user successfully', async () => {
               pool.query = mockDbResponse([[{task_id: '123'}], [{user_id: '123'}], { affectedRows: 1 },[{task_id: '123', task_name: 'Screen full text', assigned_user_id: '123', due_date: '2024-01-01'}]]);
               const res = await request(app)
                   .post('/tasks/123/assign')
                 .set('Authorization', `Bearer ${authToken}`)
                   .send({ user_id: '123', due_date: '2024-01-01' });
                expect(res.status).toBe(200);
               expect(res.body).toHaveProperty('task_id', '123');
              expect(res.body).toHaveProperty('task_name', 'Screen full text');
                expect(res.body).toHaveProperty('assigned_user_id', '123');
                expect(res.body).toHaveProperty('due_date', '2024-01-01');
            });
          it('should return 404 if task is not found', async () => {
               pool.query = mockDbResponse([[]]);
            const res = await request(app)
                   .post('/tasks/123/assign')
                   .set('Authorization', `Bearer ${authToken}`)
                    .send({ user_id: '123', due_date: '2024-01-01' });
             expect(res.status).toBe(404);
            expect(res.body.message).toBe('Task with id 123 not found');
        });
           it('should return 404 if user is not found', async () => {
                pool.query = mockDbResponse([[{task_id: '123'}],[]]);
              const res = await request(app)
                   .post('/tasks/123/assign')
                   .set('Authorization', `Bearer ${authToken}`)
                 .send({ user_id: '123', due_date: '2024-01-01' });
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User with id 123 not found');
        });
            it('should return 400 if user_id is missing', async () => {
               const res = await request(app)
                   .post('/tasks/123/assign')
                .set('Authorization', `Bearer ${authToken}`)
                   .send({ due_date: '2024-01-01' });
             expect(res.status).toBe(400);
           expect(res.body.message).toBe('User id is required and must be a valid uuid');
        });
           it('should return 400 for invalid user id format', async () => {
               const res = await request(app)
                   .post('/tasks/123/assign')
                    .set('Authorization', `Bearer ${authToken}`)
                  .send({ user_id: 'invalid-uuid', due_date: '2024-01-01' });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('User id is required and must be a valid uuid');
         });
          it('should return 400 if due_date format is invalid', async () => {
               const res = await request(app)
                  .post('/tasks/123/assign')
                   .set('Authorization', `Bearer ${authToken}`)
                .send({ user_id: '123', due_date: '2024/12/12' });
             expect(res.status).toBe(400);
              expect(res.body.message).toBe('Due date must be a valid date in the format YYYY-MM-DD.');
        });
            it('should return error for invalid task id', async () => {
                const res = await request(app)
                  .post('/tasks/invalid-uuid/assign')
                    .set('Authorization', `Bearer ${authToken}`)
                   .send({ user_id: '123', due_date: '2024-01-01' });
               expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid task id format');
         });
      });
       describe('POST /tasks/:task_id/dependencies', () => {
             it('should add a new dependency to task successfully', async () => {
               pool.query = mockDbResponse([[{task_id: '123'}], [{task_id: '456'}], { affectedRows: 1 }, [{task_id: '123', task_name:'testTask'}], [{dependency_id:'456'}]])
                const res = await request(app)
                   .post('/tasks/123/dependencies')
                    .set('Authorization', `Bearer ${authToken}`)
                 .send({ dependency_id: '456' });
                 expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('task_id', '123');
              expect(res.body).toHaveProperty('task_name', 'testTask');
               expect(res.body).toHaveProperty('dependencies');
              expect(res.body.dependencies).toEqual(expect.arrayContaining([expect.objectContaining({dependency_id: '456'})]));

            });
            it('should return 404 if task is not found', async () => {
              pool.query = mockDbResponse([[]]);
                const res = await request(app)
                    .post('/tasks/123/dependencies')
                     .set('Authorization', `Bearer ${authToken}`)
                    .send({ dependency_id: '456' });
                expect(res.status).toBe(404);
                 expect(res.body.message).toBe('Task with id 123 not found');
            });
            it('should return 404 if dependency id is not a valid task', async () => {
               pool.query = mockDbResponse([[{task_id: '123'}],[]]);
               const res = await request(app)
                   .post('/tasks/123/dependencies')
                  .set('Authorization', `Bearer ${authToken}`)
                  .send({ dependency_id: '456' });
                expect(res.status).toBe(404);
               expect(res.body.message).toBe('Task with id 456 not found.');
           });
          it('should return 400 if dependency_id is missing', async () => {
                const res = await request(app)
                   .post('/tasks/123/dependencies')
                   .set('Authorization', `Bearer ${authToken}`)
                    .send({});
             expect(res.status).toBe(400);
              expect(res.body.message).toBe('Invalid dependency id format');
          });
          it('should return error for invalid dependency id', async () => {
               const res = await request(app)
                   .post('/tasks/123/dependencies')
                    .set('Authorization', `Bearer ${authToken}`)
                   .send({ dependency_id: 'invalid-uuid' });
              expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid dependency id format');
         });
           it('should return error for invalid task id', async () => {
                const res = await request(app)
                   .post('/tasks/invalid-uuid/dependencies')
                   .set('Authorization', `Bearer ${authToken}`)
                   .send({ dependency_id: '123' });
               expect(res.status).toBe(400);
               expect(res.body.message).toBe('Invalid task id format');
         });
       });
    });    
  
    describe('Project Sharing Tests', () => {
        describe('POST /projects/:project_id/share', () => {
            it('should share project successfully with user', async () => {
                pool.query = mockDbResponse([[{project_id: '123'}], [{user_id: '456'}],{ affectedRows: 1 }])
               const res = await request(app)
                    .post('/projects/123/share')
                   .set('Authorization', `Bearer ${authToken}`)
                   .send({ share_with: 'testuser@example.com', access_type: 'read-only', share_link: false });
               expect(res.status).toBe(200);
               expect(res.body.message).toBe('Project shared successfully.');
           });
            it('should generate a shareable link successfully', async () => {
                pool.query = mockDbResponse([[{project_id: '123'}],{ affectedRows: 1 }]);
                const res = await request(app)
                    .post('/projects/123/share')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ share_link: true, password: 'Password123' });
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('message', 'Shareable link generated.');
               expect(res.body).toHaveProperty('share_link');
          });
          it('should return 404 if project does not exist', async () => {
               pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                     .post('/projects/123/share')
                     .set('Authorization', `Bearer ${authToken}`)
                      .send({ share_with: 'testuser@example.com', access_type: 'read-only', share_link: false });
                  expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 not found');
           });
           it('should return 404 if user is not found', async () => {
                pool.query = mockDbResponse([[{project_id: '123'}], []]);
                const res = await request(app)
                    .post('/projects/123/share')
                    .set('Authorization', `Bearer ${authToken}`)
                 .send({ share_with: 'invalid@example.com', access_type: 'read-only', share_link: false });
              expect(res.status).toBe(404);
             expect(res.body.message).toBe('User with username/email invalid@example.com not found');
           });
            it('should return 400 error if share_with is missing when share_link is false', async () => {
                const res = await request(app)
                    .post('/projects/123/share')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({  access_type: 'read-only', share_link: false });
                expect(res.status).toBe(400);
               expect(res.body.message).toBe('Share with must be a string.');
            });
             it('should return 400 error for invalid access_type value', async () => {
                const res = await request(app)
                    .post('/projects/123/share')
                   .set('Authorization', `Bearer ${authToken}`)
                    .send({ share_with: 'testuser@example.com', access_type: 'invalid', share_link: false });
               expect(res.status).toBe(400);
               expect(res.body.message).toBe('Access type must be read-only or read-write');
           });
           it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .post('/projects/invalid-uuid/share')
                   .set('Authorization', `Bearer ${authToken}`)
                 .send({ share_with: 'testuser@example.com', access_type: 'read-only', share_link: false });
               expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid project id format');
            });
        });
        describe('GET /projects/:project_id/share', () => {
           it('should fetch shareable link for the project successfully', async () => {
                pool.query = mockDbResponse([[{project_id: '123'}], [{share_link_id: '123', password: 'hashedpassword'}]]);
               const res = await request(app)
                   .get('/projects/123/share')
                   .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
               expect(res.body).toHaveProperty('share_link', 'http://localhost:3000/projects/shared/123');
           });
           it('should return 404 if project does not exist', async () => {
              pool.query = mockDbResponse([[]]);
               const res = await request(app)
                   .get('/projects/123/share')
                   .set('Authorization', `Bearer ${authToken}`);
             expect(res.status).toBe(404);
             expect(res.body.message).toBe('Project with id 123 not found');
          });
          it('should return 404 if shareable link not found for project', async () => {
             pool.query = mockDbResponse([[{project_id: '123'}],[]]);
            const res = await request(app)
                .get('/projects/123/share')
                .set('Authorization', `Bearer ${authToken}`);
             expect(res.status).toBe(404);
           expect(res.body.message).toBe('Shareable link not found for project with id 123.');
        });
          it('should return error for invalid project id', async () => {
              const res = await request(app)
                   .get('/projects/invalid-uuid/share')
                 .set('Authorization', `Bearer ${authToken}`);
             expect(res.status).toBe(400);
           expect(res.body.message).toBe('Invalid project id format');
        });
      });
    });
     describe('Project Lifecycle Tests', () => {
         describe('GET /projects/:project_id/lifecycle', () => {
            it('should return project lifecycle state', async () => {
               pool.query = mockDbResponse([[{ project_id: '123', status: 'active' }]]);
              const res = await request(app)
                    .get('/projects/123/lifecycle')
                     .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('state', 'active');
                expect(res.body).toHaveProperty('project_id', '123');
            });
            it('should return 404 if project does not exist', async () => {
                 pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                    .get('/projects/123/lifecycle')
                     .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
               expect(res.body.message).toBe('Project with id 123 does not exist');
         });
            it('should return error for invalid project id', async () => {
                 const res = await request(app)
                     .get('/projects/invalid-uuid/lifecycle')
                      .set('Authorization', `Bearer ${authToken}`);
               expect(res.status).toBe(400);
               expect(res.body.message).toBe('Invalid project id format');
            });
        });
         describe('POST /projects/:project_id/:action', () => {
              it('should transition project lifecycle to initiation phase successfully', async () => {
                  pool.query = mockDbResponse([[{project_id: '123'}],{ affectedRows: 1 }]);
                  const res = await request(app)
                       .post('/projects/123/initiation')
                      .set('Authorization', `Bearer ${authToken}`);
                    expect(res.status).toBe(200);
                     expect(res.body).toHaveProperty('state', 'initiation');
                 });
                 it('should transition project lifecycle to planning phase successfully', async () => {
                      pool.query = mockDbResponse([[{project_id: '123'}],{ affectedRows: 1 }]);
                     const res = await request(app)
                         .post('/projects/123/planning')
                        .set('Authorization', `Bearer ${authToken}`);
                       expect(res.status).toBe(200);
                       expect(res.body).toHaveProperty('state', 'planning');
                   });
            it('should return 404 if project does not exist', async () => {
                 pool.query = mockDbResponse([[]]);
                  const res = await request(app)
                       .post('/projects/123/initiation')
                    .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(404);
                  expect(res.body.message).toBe('Project with id 123 does not exist');
            });
           it('should return 400 if the action is invalid', async () => {
                 const res = await request(app)
                     .post('/projects/123/invalid-action')
                       .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(400);
                 expect(res.body.message).toBe('Invalid action');
           });
              it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .post('/projects/invalid-uuid/initiation')
                   .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(400);
                 expect(res.body.message).toBe('Invalid project id format');
            });
        });
    });
   describe('Project Document Management Tests', () => {
       describe('GET /projects/:project_id/documents/:document_id', () => {
           it('should fetch a document successfully using project id and document id', async () => {
                const document = { document_id: '123', content: 'Test content' };
                pool.query = mockDbResponse([[{project_id: '123'}], [document]]);
             const res = await request(app)
                   .get('/projects/123/documents/123')
                  .set('Authorization', `Bearer ${authToken}`);
               expect(res.status).toBe(200);
             expect(res.body).toHaveProperty('document_id', '123');
            expect(res.body).toHaveProperty('content', 'Test content');
         });
            it('should return 404 if project not found', async () => {
                pool.query = mockDbResponse([[]]);
                const res = await request(app)
                  .get('/projects/123/documents/123')
                   .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 not found');
            });
             it('should return 404 if document does not exists', async () => {
                 pool.query = mockDbResponse([[{project_id: '123'}],[]]);
               const res = await request(app)
                     .get('/projects/123/documents/123')
                     .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(404);
                expect(res.body.message).toBe('Document with id 123 not found.');
            });
           it('should return error for invalid document id', async () => {
               const res = await request(app)
                 .get('/projects/123/documents/invalid-uuid')
                    .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid document id format');
        });
            it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .get('/projects/invalid-uuid/documents/123')
                   .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid project id format');
            });
        });
         describe('PUT /projects/:project_id/documents/:document_id', () => {
            it('should update the document content successfully', async () => {
                 const document = { document_id: '123', content: 'New Content' };
                pool.query = mockDbResponse([[{project_id: '123'}], [{content: 'old content'}], { affectedRows: 1 }, [document]]);
               const res = await request(app)
                    .put('/projects/123/documents/123')
                 .set('Authorization', `Bearer ${authToken}`)
                  .send({ content: 'New Content' });
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('document_id', '123');
               expect(res.body).toHaveProperty('content', 'New Content');
            });
             it('should create a document if does not exists', async () => {
                 const document = { document_id: '123', content: 'New Content' };
                 pool.query = mockDbResponse([[{project_id: '123'}],[], { affectedRows: 1 },[document]]);
               const res = await request(app)
                  .put('/projects/123/documents/123')
                 .set('Authorization', `Bearer ${authToken}`)
                   .send({ content: 'New Content' });
                expect(res.status).toBe(200);
              expect(res.body).toHaveProperty('document_id', '123');
               expect(res.body).toHaveProperty('content', 'New Content');
           });
          it('should return 404 if project does not exists', async () => {
                pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                     .put('/projects/123/documents/123')
                   .set('Authorization', `Bearer ${authToken}`)
                   .send({ content: 'New Content' });
              expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 not found');
           });
          it('should return error if document content is missing', async () => {
                const res = await request(app)
                   .put('/projects/123/documents/123')
                  .set('Authorization', `Bearer ${authToken}`)
                   .send({});
                expect(res.status).toBe(400);
               expect(res.body.message).toBe('Content is required and must be a string not more than 5000 characters.');
           });
           it('should return error for invalid project id', async () => {
               const res = await request(app)
                 .put('/projects/invalid-uuid/documents/123')
                 .set('Authorization', `Bearer ${authToken}`)
                   .send({ content: 'New Content' });
              expect(res.status).toBe(400);
              expect(res.body.message).toBe('Invalid project id format');
         });
        it('should return error for invalid document id', async () => {
             const res = await request(app)
                .put('/projects/123/documents/invalid-uuid')
                .set('Authorization', `Bearer ${authToken}`)
               .send({ content: 'New Content' });
           expect(res.status).toBe(400);
           expect(res.body.message).toBe('Invalid document id format');
      });
        });
        describe('GET /projects/:project_id/documents/:document_id/version', () => {
            it('should fetch version history successfully', async () => {
                 const versions = [{ version_id: '123', version_date: '2024-01-01' }];
                  pool.query = mockDbResponse([[{document_id: '123'}], [versions] ]);
                const res = await request(app)
                     .get('/projects/123/documents/123/version')
                      .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(200);
                expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ version_id: '123', version_date: '2024-01-01' })]));
            });
            it('should return 404 if document does not exist', async () => {
               pool.query = mockDbResponse([[]]);
               const res = await request(app)
                     .get('/projects/123/documents/123/version')
                     .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
              expect(res.body.message).toBe('Document with id 123 not found.');
          });
           it('should return error for invalid document id', async () => {
             const res = await request(app)
                     .get('/projects/123/documents/invalid-uuid/version')
                    .set('Authorization', `Bearer ${authToken}`);
             expect(res.status).toBe(400);
           expect(res.body.message).toBe('Invalid document id format');
        });
             it('should return error for invalid project id', async () => {
                const res = await request(app)
                  .get('/projects/invalid-uuid/documents/123/version')
                  .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(400);
              expect(res.body.message).toBe('Invalid project id format');
           });
        });
       describe('POST /documents/:document_id/versions/:versionId/revert', () => {
             it('should revert the document to specified version successfully', async () => {
                 const version = { content: 'version content', version_id: '456' };
                  pool.query = mockDbResponse([[{document_id: '123'}], [version], { affectedRows: 1 }, [version]]);
                const res = await request(app)
                    .post('/documents/123/versions/456/revert')
                   .set('Authorization', `Bearer ${authToken}`)
                   expect(res.status).toBe(200);
                 expect(res.body).toHaveProperty('document_id', '123');
               expect(res.body).toHaveProperty('content', 'version content');
           });
          it('should return 404 if document does not exists', async () => {
                pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                    .post('/documents/123/versions/456/revert')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
              expect(res.body.message).toBe('Document with id 123 not found.');
          });
            it('should return 404 if version is not found for document', async () => {
                pool.query = mockDbResponse([[{document_id: '123'}],[]]);
                 const res = await request(app)
                  .post('/documents/123/versions/456/revert')
                  .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
                expect(res.body.message).toBe('Version with id 456 not found for document with id 123.');
          });
            it('should return error for invalid document id', async () => {
                const res = await request(app)
                   .post('/documents/invalid-uuid/versions/123/revert')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(400);
              expect(res.body.message).toBe('Invalid document id format');
          });
           it('should return error for invalid version id', async () => {
               const res = await request(app)
                    .post('/documents/123/versions/invalid-uuid/revert')
                    .set('Authorization', `Bearer ${authToken}`);
             expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid version id format');
           });
       });
    });
});

   describe('Project Files Management Tests', () => {
        describe('GET /projects/:project_id/files', () => {
           it('should fetch files for the project successfully', async () => {
               const files = [{ file_id: '123', file_path: '/upload/test.pdf', file_name: 'test.pdf' }];
                pool.query = mockDbResponse([[{project_id: '123'}], [files]]);
              const res = await request(app)
                    .get('/projects/123/files')
                    .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(200);
                  expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({file_id: '123', file_path: '/upload/test.pdf', file_name: 'test.pdf' })]));
            });
             it('should return 404 if project is not found', async () => {
                 pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                    .get('/projects/123/files')
                      .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(404);
                  expect(res.body.message).toBe('Project with id 123 not found');
            });
           it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .get('/projects/invalid-uuid/files')
                    .set('Authorization', `Bearer ${authToken}`);
               expect(res.status).toBe(400);
               expect(res.body.message).toBe('Invalid project id format');
           });
        });
        describe('POST /projects/:project_id/files', () => {
            it('should upload file successfully', async () => {
                pool.query = mockDbResponse([[{project_id: '123'}], { affectedRows: 1 }]);
               const res = await request(app)
                  .post('/projects/123/files')
                  .set('Authorization', `Bearer ${authToken}`)
                  .attach('file', './test-file.pdf');
                expect(res.status).toBe(201);
               expect(res.body).toHaveProperty('file_id');
                expect(res.body).toHaveProperty('file_path', '/uploads/test-file.pdf');
                 expect(res.body).toHaveProperty('file_name', 'test-file.pdf');
            });
           it('should return 404 if project does not exist', async () => {
                 pool.query = mockDbResponse([[]]);
               const res = await request(app)
                    .post('/projects/123/files')
                     .set('Authorization', `Bearer ${authToken}`)
                    .attach('file', './test-file.pdf');
                expect(res.status).toBe(404);
              expect(res.body.message).toBe('Project with id 123 not found');
          });
          it('should return 400 if no file is uploaded', async () => {
               const res = await request(app)
                    .post('/projects/123/files')
                    .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(400);
              expect(res.body.message).toBe('No file was uploaded');
        });
         it('should return 400 if wrong file type uploaded', async () => {
              pool.query = mockDbResponse([[{project_id: '123'}]]);
            const res = await request(app)
                 .post('/projects/123/files')
                  .set('Authorization', `Bearer ${authToken}`)
                .attach('file', './test-file.txt');
           expect(res.status).toBe(400);
            expect(res.body.message).toBe('Only image and pdf file format allowed.');
       });
          it('should return error if file is too big', async () => {
              pool.query = mockDbResponse([[{project_id: '123'}]]);
                const res = await request(app)
                     .post('/projects/123/files')
                    .set('Authorization', `Bearer ${authToken}`)
                   .attach('file', './test-large-file.pdf');
                 expect(res.status).toBe(400);
              expect(res.body.message).toBe('File size should not exceed 5MB.');
           });
         it('should return error for invalid project id', async () => {
            const res = await request(app)
               .post('/projects/invalid-uuid/files')
              .set('Authorization', `Bearer ${authToken}`)
               .attach('file', './test-file.pdf');
             expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid project id format');
        });
        });
    });
    describe('Project Comments Tests', () => {
      describe('GET /projects/:project_id/comments', () => {
           it('should fetch comments for a project successfully', async () => {
            const comments = [{ comment_id: '123', text: 'Test comment' }];
              pool.query = mockDbResponse([[{project_id: '123'}], [comments]]);
              const res = await request(app)
                   .get('/projects/123/comments')
                   .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
                expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ comment_id: '123', text: 'Test comment' })]));
           });
            it('should return 404 if project is not found', async () => {
               pool.query = mockDbResponse([[]]);
                const res = await request(app)
                    .get('/projects/123/comments')
                  .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(404);
               expect(res.body.message).toBe('Project with id 123 not found');
           });
             it('should return error for invalid project id', async () => {
               const res = await request(app)
                    .get('/projects/invalid-uuid/comments')
                   .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(400);
                  expect(res.body.message).toBe('Invalid project id format');
             });
        });
         describe('POST /projects/:project_id/comments', () => {
            it('should add a new comment successfully to a project', async () => {
               pool.query = mockDbResponse([[{project_id: '123'}], { affectedRows: 1 }]);
                 const res = await request(app)
                  .post('/projects/123/comments')
                    .set('Authorization', `Bearer ${authToken}`)
                   .send({ text: 'Test comment' });
               expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('comment_id');
               expect(res.body).toHaveProperty('text', 'Test comment');
           });
           it('should return 404 if project does not exist', async () => {
                pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                    .post('/projects/123/comments')
                   .set('Authorization', `Bearer ${authToken}`)
                  .send({ text: 'Test comment' });
               expect(res.status).toBe(404);
               expect(res.body.message).toBe('Project with id 123 not found');
           });
         it('should return 400 if comment text is missing', async () => {
                const res = await request(app)
                     .post('/projects/123/comments')
                      .set('Authorization', `Bearer ${authToken}`)
                   .send({});
              expect(res.status).toBe(400);
            expect(res.body.message).toBe('Comment text is required, and must be a string not more than 1000 characters.');
        });
            it('should return error for invalid project id', async () => {
                 const res = await request(app)
                    .post('/projects/invalid-uuid/comments')
                   .set('Authorization', `Bearer ${authToken}`)
                   .send({ text: 'Test comment' });
                expect(res.status).toBe(400);
              expect(res.body.message).toBe('Invalid project id format');
           });
       });
   });
});

    describe('Project Files Management Tests', () => {
        describe('GET /projects/:project_id/files', () => {
            it('should fetch files for the project successfully', async () => {
                 const files = [{ file_id: '123', file_path: '/upload/test.pdf', file_name: 'test.pdf' }];
                 pool.query = mockDbResponse([[{project_id: '123'}], [files]]);
               const res = await request(app)
                    .get('/projects/123/files')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
                expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({file_id: '123', file_path: '/upload/test.pdf', file_name: 'test.pdf' })]));
            });
             it('should return 404 if project does not exist', async () => {
                  pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                     .get('/projects/123/files')
                      .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 not found');
          });
          it('should return error for invalid project id', async () => {
            const res = await request(app)
                    .get('/projects/invalid-uuid/files')
                      .set('Authorization', `Bearer ${authToken}`);
             expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid project id format');
         });
        });
        describe('POST /projects/:project_id/files', () => {
            it('should upload file successfully', async () => {
              pool.query = mockDbResponse([[{project_id: '123'}], { affectedRows: 1 }]);
             const res = await request(app)
                  .post('/projects/123/files')
                  .set('Authorization', `Bearer ${authToken}`)
                  .attach('file', './test-file.pdf');
                expect(res.status).toBe(201);
               expect(res.body).toHaveProperty('file_id');
              expect(res.body).toHaveProperty('file_path', '/uploads/test-file.pdf');
              expect(res.body).toHaveProperty('file_name', 'test-file.pdf');
           });
           it('should return 404 if project does not exist', async () => {
                 pool.query = mockDbResponse([[]]);
                const res = await request(app)
                    .post('/projects/123/files')
                    .set('Authorization', `Bearer ${authToken}`)
                   .attach('file', './test-file.pdf');
                 expect(res.status).toBe(404);
                 expect(res.body.message).toBe('Project with id 123 not found');
            });
           it('should return 400 if no file is uploaded', async () => {
                const res = await request(app)
                    .post('/projects/123/files')
                      .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(400);
                expect(res.body.message).toBe('No file was uploaded');
         });
            it('should return 400 if wrong file type uploaded', async () => {
                  pool.query = mockDbResponse([[{project_id: '123'}]]);
               const res = await request(app)
                    .post('/projects/123/files')
                    .set('Authorization', `Bearer ${authToken}`)
                    .attach('file', './test-file.txt');
               expect(res.status).toBe(400);
               expect(res.body.message).toBe('Only image and pdf file format allowed.');
          });
            it('should return error if file is too big', async () => {
                pool.query = mockDbResponse([[{project_id: '123'}]]);
                const res = await request(app)
                    .post('/projects/123/files')
                   .set('Authorization', `Bearer ${authToken}`)
                   .attach('file', './test-large-file.pdf');
                expect(res.status).toBe(400);
               expect(res.body.message).toBe('File size should not exceed 5MB.');
         });
          it('should return error for invalid project id', async () => {
                const res = await request(app)
                    .post('/projects/invalid-uuid/files')
                    .set('Authorization', `Bearer ${authToken}`)
                    .attach('file', './test-file.pdf');
                expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid project id format');
           });
      });
    });
    describe('Project Lifecycle Tests', () => {
          describe('GET /projects/:project_id/lifecycle', () => {
               it('should return project lifecycle state', async () => {
                  pool.query = mockDbResponse([[{ project_id: '123', status: 'active' }]]);
                const res = await request(app)
                    .get('/projects/123/lifecycle')
                     .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
               expect(res.body).toHaveProperty('state', 'active');
              expect(res.body).toHaveProperty('project_id', '123');
            });
             it('should return 404 if project does not exist', async () => {
                  pool.query = mockDbResponse([[]]);
                   const res = await request(app)
                       .get('/projects/123/lifecycle')
                      .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 does not exist');
            });
              it('should return error for invalid project id', async () => {
                   const res = await request(app)
                      .get('/projects/invalid-uuid/lifecycle')
                      .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(400);
                 expect(res.body.message).toBe('Invalid project id format');
           });
        });
        describe('POST /projects/:project_id/:action', () => {
             it('should transition project lifecycle to initiation phase successfully', async () => {
                 pool.query = mockDbResponse([[{project_id: '123'}], { affectedRows: 1 }]);
                 const res = await request(app)
                     .post('/projects/123/initiation')
                     .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
               expect(res.body).toHaveProperty('state', 'initiation');
           });
            it('should transition project lifecycle to planning phase successfully', async () => {
                 pool.query = mockDbResponse([[{project_id: '123'}],{ affectedRows: 1 }]);
                 const res = await request(app)
                     .post('/projects/123/planning')
                       .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(200);
               expect(res.body).toHaveProperty('state', 'planning');
           });
           it('should return 404 if project does not exist', async () => {
                pool.query = mockDbResponse([[]]);
                const res = await request(app)
                    .post('/projects/123/initiation')
                    .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(404);
               expect(res.body.message).toBe('Project with id 123 does not exist');
           });
            it('should return 400 if the action is invalid', async () => {
                 const res = await request(app)
                     .post('/projects/123/invalid-action')
                     .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid action');
           });
             it('should return error for invalid project id', async () => {
               const res = await request(app)
                    .post('/projects/invalid-uuid/initiation')
                    .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid project id format');
          });
        });
    });
     describe('Project Document Management Tests', () => {
         describe('GET /projects/:project_id/documents/:document_id', () => {
            it('should fetch a document successfully using project id and document id', async () => {
                  const document = { document_id: '123', content: 'Test content' };
                  pool.query = mockDbResponse([[{project_id: '123'}], [document]]);
                const res = await request(app)
                       .get('/projects/123/documents/123')
                       .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('document_id', '123');
                 expect(res.body).toHaveProperty('content', 'Test content');
            });
             it('should return 404 if project not found', async () => {
                 pool.query = mockDbResponse([[]]);
                const res = await request(app)
                      .get('/projects/123/documents/123')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(404);
                expect(res.body.message).toBe('Project with id 123 not found');
            });
            it('should return 404 if document does not exists', async () => {
                  pool.query = mockDbResponse([[{project_id: '123'}],[]]);
                 const res = await request(app)
                       .get('/projects/123/documents/123')
                      .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(404);
                expect(res.body.message).toBe('Document with id 123 not found.');
             });
              it('should return error for invalid document id', async () => {
                 const res = await request(app)
                     .get('/projects/123/documents/invalid-uuid')
                    .set('Authorization', `Bearer ${authToken}`);
               expect(res.status).toBe(400);
               expect(res.body.message).toBe('Invalid document id format');
           });
            it('should return error for invalid project id', async () => {
                 const res = await request(app)
                     .get('/projects/invalid-uuid/documents/123')
                     .set('Authorization', `Bearer ${authToken}`);
                 expect(res.status).toBe(400);
               expect(res.body.message).toBe('Invalid project id format');
           });
        });
         describe('PUT /projects/:project_id/documents/:document_id', () => {
             it('should update the document content successfully', async () => {
                  const document = { document_id: '123', content: 'New Content' };
                 pool.query = mockDbResponse([[{project_id: '123'}], [{content: 'old content'}], { affectedRows: 1 }, [document]]);
              const res = await request(app)
                     .put('/projects/123/documents/123')
                      .set('Authorization', `Bearer ${authToken}`)
                      .send({ content: 'New Content' });
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('document_id', '123');
                 expect(res.body).toHaveProperty('content', 'New Content');
           });
             it('should create a document if does not exists', async () => {
                 const document = { document_id: '123', content: 'New Content' };
                  pool.query = mockDbResponse([[{project_id: '123'}],[], { affectedRows: 1 },[document]]);
                const res = await request(app)
                      .put('/projects/123/documents/123')
                      .set('Authorization', `Bearer ${authToken}`)
                     .send({ content: 'New Content' });
                 expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('document_id', '123');
                 expect(res.body).toHaveProperty('content', 'New Content');
           });
           it('should return 404 if project does not exists', async () => {
                 pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                       .put('/projects/123/documents/123')
                      .set('Authorization', `Bearer ${authToken}`)
                      .send({ content: 'New Content' });
                 expect(res.status).toBe(404);
                 expect(res.body.message).toBe('Project with id 123 not found');
            });
           it('should return 400 if document content is missing', async () => {
               const res = await request(app)
                   .put('/projects/123/documents/123')
                   .set('Authorization', `Bearer ${authToken}`)
                 .send({});
                expect(res.status).toBe(400);
               expect(res.body.message).toBe('Content is required and must be a string not more than 5000 characters.');
           });
             it('should return error for invalid project id', async () => {
                 const res = await request(app)
                     .put('/projects/invalid-uuid/documents/123')
                      .set('Authorization', `Bearer ${authToken}`)
                      .send({ content: 'New Content' });
              expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid project id format');
          });
          it('should return error for invalid document id', async () => {
                const res = await request(app)
                    .put('/projects/123/documents/invalid-uuid')
                    .set('Authorization', `Bearer ${authToken}`)
                  .send({ content: 'New Content' });
             expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid document id format');
          });
       });
          describe('GET /projects/:project_id/documents/:document_id/version', () => {
               it('should fetch version history successfully', async () => {
                    const versions = [{ version_id: '123', version_date: '2024-01-01' }];
                    pool.query = mockDbResponse([[{document_id: '123'}], [versions]]);
                  const res = await request(app)
                       .get('/projects/123/documents/123/version')
                        .set('Authorization', `Bearer ${authToken}`);
                     expect(res.status).toBe(200);
                  expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ version_id: '123', version_date: '2024-01-01' })]));
              });
              it('should return 404 if document does not exist', async () => {
                    pool.query = mockDbResponse([[]]);
                    const res = await request(app)
                      .get('/projects/123/documents/123/version')
                      .set('Authorization', `Bearer ${authToken}`);
                    expect(res.status).toBe(404);
                  expect(res.body.message).toBe('Document with id 123 not found.');
               });
              it('should return error for invalid document id', async () => {
                const res = await request(app)
                      .get('/projects/123/documents/invalid-uuid/version')
                       .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(400);
                 expect(res.body.message).toBe('Invalid document id format');
             });
              it('should return error for invalid project id', async () => {
                  const res = await request(app)
                      .get('/projects/invalid-uuid/documents/123/version')
                    .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(400);
                expect(res.body.message).toBe('Invalid project id format');
             });
          });
            describe('POST /documents/:document_id/versions/:versionId/revert', () => {
                 it('should revert the document to specified version successfully', async () => {
                      const version = { content: 'version content', version_id: '456' };
                      pool.query = mockDbResponse([[{document_id: '123'}], [version], { affectedRows: 1 }, [version]]);
                  const res = await request(app)
                        .post('/documents/123/versions/456/revert')
                        .set('Authorization', `Bearer ${authToken}`)
                     expect(res.status).toBe(200);
                     expect(res.body).toHaveProperty('document_id', '123');
                   expect(res.body).toHaveProperty('content', 'version content');
             });
           it('should return 404 if document does not exists', async () => {
              pool.query = mockDbResponse([[]]);
                 const res = await request(app)
                       .post('/documents/123/versions/456/revert')
                    .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(404);
                expect(res.body.message).toBe('Document with id 123 not found.');
            });
          it('should return 404 if version is not found for document', async () => {
               pool.query = mockDbResponse([[{document_id: '123'}],[]]);
               const res = await request(app)
                      .post('/documents/123/versions/456/revert')
                     .set('Authorization', `Bearer ${authToken}`);
                  expect(res.status).toBe(404);
                 expect(res.body.message).toBe('Version with id 456 not found for document with id 123.');
           });
          it('should return error for invalid document id', async () => {
               const res = await request(app)
                  .post('/documents/invalid-uuid/versions/123/revert')
                   .set('Authorization', `Bearer ${authToken}`);
                expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid document id format');
         });
            it('should return error for invalid version id', async () => {
                 const res = await request(app)
                   .post('/documents/123/versions/invalid-uuid/revert')
                     .set('Authorization', `Bearer ${authToken}`);
              expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid version id format');
         });
        });
     });
});