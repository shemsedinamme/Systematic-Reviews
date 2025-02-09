const request = require('supertest');
const app = require('../index'); // Assuming your main app file is in the root
const pool = require('../database');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

describe('Screening Routes', () => {
  let authToken;
  let testProjectId;
  let testArticleId;

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
           const article = await pool.query(
             `INSERT INTO articles (article_id, database_id, title, authors, abstract, publication_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), 'pubmed', 'test article', 'test author', 'test abstract', '2024-01-01']
          );
          testArticleId = article[0].insertId
      const response = await request(app)
          .post('/login')
          .send({ usernameEmail: 'testuser', password: 'Password123' });
      authToken = response.body.token;
    });

    afterAll(async () => {
        // Clean up
        await pool.query('DELETE from users WHERE username = ?', ['testuser']);
         await pool.query('DELETE from projects WHERE project_id = ?', [testProjectId]);
         await pool.query('DELETE from articles WHERE article_id = ?', [testArticleId]);
   })
   // Test cases for /screening/title-abstract
  describe('GET /screening/title-abstract', () => {
     it('should fetch articles for title and abstract screening', async () => {
        const response = await request(app)
          .get(`/screening/title-abstract?project_id=${testProjectId}`)
           .set('Authorization', `Bearer ${authToken}`)
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.articles)).toBeTruthy();
        expect(response.body).toHaveProperty('screened_count')
          expect(response.body).toHaveProperty('remaining_count')
      });

      it('should not fetch articles for title and abstract screening if project id is not provided', async () => {
        const response = await request(app)
          .get('/screening/title-abstract')
           .set('Authorization', `Bearer ${authToken}`)
        expect(response.statusCode).toBe(400);
         expect(response.body).toHaveProperty('message','Project id is required');
      });
   });

    describe('POST /screening/title-abstract', () => {
       it('should save the screening decision', async () => {
         const response = await request(app)
             .post('/screening/title-abstract')
             .set('Authorization', `Bearer ${authToken}`)
              .send({
                 article_id: testArticleId,
               decision: 'include',
                screening_stage: 'title/abstract'
            });
            expect(response.statusCode).toBe(200);
           expect(response.body).toHaveProperty('message');
        });

        it('should not save the screening decision if article id and decision are not provided', async () => {
            const response = await request(app)
                .post('/screening/title-abstract')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    screening_stage: 'title/abstract'
                });
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message', 'Article id is required for decision.');
        });
    });
  // Test cases for /screening/full-text
  describe('GET /screening/full-text', () => {
         it('should fetch articles for full text screening', async () => {
           const response = await request(app)
               .get(`/screening/full-text?project_id=${testProjectId}`)
               .set('Authorization', `Bearer ${authToken}`)
           expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();
         });
         it('should not fetch articles for full text screening if project id is not provided', async () => {
            const response = await request(app)
                .get('/screening/full-text')
                .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(400);
               expect(response.body).toHaveProperty('message', 'Invalid project id format');
        });
   });
   describe('POST /screening/full-text', () => {
        it('should save the full text screening decision', async () => {
           const response = await request(app)
                .post('/screening/full-text')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                 article_id: testArticleId,
                  decision: 'include',
                  screening_stage: 'full-text'
                });
           expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('message');
        });
         it('should not save the full text screening decision if article id or decision is not provided.', async () => {
           const response = await request(app)
                .post('/screening/full-text')
               .set('Authorization', `Bearer ${authToken}`)
               .send({
                screening_stage: 'full-text'
               });
            expect(response.statusCode).toBe(400);
           expect(response.body).toHaveProperty('message', 'Article id is required for decision.');
         });
   });
    // Test cases for /screening/criteria
    describe('GET /screening/criteria', () => {
       it('should fetch screening criteria', async () => {
            const response = await request(app)
              .get(`/screening/criteria?project_id=${testProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
          expect(response.statusCode).toBe(200);
           expect(response.body).toHaveProperty('inclusion_criteria');
           expect(response.body).toHaveProperty('exclusion_criteria');
        });
    });
  describe('POST /screening/criteria', () => {
        it('should create a new inclusion criteria for a project', async () => {
           const response = await request(app)
                .post('/screening/criteria')
                 .set('Authorization', `Bearer ${authToken}`)
              .send({
                    project_id: testProjectId,
                    criterion: 'test inclusion criteria',
                    type: 'inclusion'
                 });
          expect(response.statusCode).toBe(201);
           expect(response.body).toHaveProperty('criterion_id')
          expect(response.body).toHaveProperty('criterion', 'test inclusion criteria')
        });
        it('should create a new exclusion criteria for a project', async () => {
            const response = await request(app)
                .post('/screening/criteria')
                 .set('Authorization', `Bearer ${authToken}`)
                .send({
                    project_id: testProjectId,
                    criterion: 'test exclusion criteria',
                  type: 'exclusion'
                 });
           expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('criterion_id')
            expect(response.body).toHaveProperty('criterion', 'test exclusion criteria')
        });

       it('should not create a new inclusion/exclusion criteria if input is invalid', async () => {
           const response = await request(app)
               .post('/screening/criteria')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                 project_id: testProjectId,
                });
             expect(response.statusCode).toBe(400);
             expect(response.body).toHaveProperty('message', 'Criteria is required, and must be a string not more than 2000 characters.');
        });
   });
   describe('DELETE /screening/criteria/:criteria_id', () => {
          it('should delete the inclusion criteria with the given id', async () => {
           const addResponse = await request(app)
              .post('/screening/criteria')
               .set('Authorization', `Bearer ${authToken}`)
             .send({
                  project_id: testProjectId,
                  criterion: 'test inclusion criteria',
                 type: 'inclusion'
            });
            const response = await request(app)
               .delete(`/screening/criteria/${addResponse.body.criterion_id}`)
               .set('Authorization', `Bearer ${authToken}`)
              expect(response.statusCode).toBe(200);
          });
        it('should delete the exclusion criteria with the given id', async () => {
          const addResponse = await request(app)
              .post('/screening/criteria')
               .set('Authorization', `Bearer ${authToken}`)
             .send({
                  project_id: testProjectId,
                  criterion: 'test exclusion criteria',
                   type: 'exclusion'
            });
            const response = await request(app)
               .delete(`/screening/criteria/${addResponse.body.criterion_id}`)
               .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(200);
          });
         it('should not delete an inclusion/exclusion criteria if criteria id does not exist.', async () => {
            const response = await request(app)
               .delete(`/screening/criteria/${uuidv4()}`)
                .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('message','Criteria with id');
        });
    });
   // Test cases for /screening/workflow
  describe('GET /screening/workflow', () => {
    it('should fetch screening workflow for a project', async () => {
       const response = await request(app)
        .get(`/screening/workflow?project_id=${testProjectId}`)
          .set('Authorization', `Bearer ${authToken}`)
         expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
     });
      it('should not fetch screening workflow if project id is invalid.', async () => {
         const response = await request(app)
              .get(`/screening/workflow?project_id=invalid_uuid`)
            .set('Authorization', `Bearer ${authToken}`)
          expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message','Invalid project id format');
        });
   });
    describe('POST /screening/workflow/assign', () => {
        it('should assign a reviewer to a screening stage', async () => {
           const response = await request(app)
              .post(`/screening/workflow/assign`)
               .set('Authorization', `Bearer ${authToken}`)
            .send({
                    stage_name: 'title/abstract',
                 user_id: uuidv4(),
                 project_id: testProjectId
              });
            expect(response.statusCode).toBe(201);
             expect(response.body).toHaveProperty('message', 'Reviewer assigned successfully to title/abstract');
        });
      it('should not assign reviewer if input parameters are invalid', async () => {
         const response = await request(app)
              .post(`/screening/workflow/assign`)
               .set('Authorization', `Bearer ${authToken}`)
            .send({
              project_id: testProjectId,
               });
            expect(response.statusCode).toBe(400);
           expect(response.body).toHaveProperty('message', 'Stage name and user id is required for the assignment.');
        });
    });

    // Test cases for /screening/inter-rater-reliability
   describe('GET /screening/inter-rater-reliability', () => {
        it('should fetch inter-rater reliability scores', async () => {
          const response = await request(app)
             .get(`/screening/inter-rater-reliability?project_id=${testProjectId}`)
              .set('Authorization', `Bearer ${authToken}`)
             expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('cohens_kappa');
            expect(response.body).toHaveProperty('fleiss_kappa');
         });
        it('should not fetch inter-rater reliability for a project with invalid id', async () => {
         const response = await request(app)
              .get(`/screening/inter-rater-reliability?project_id=invalid-uuid`)
              .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(400);
             expect(response.body).toHaveProperty('message','Invalid project id format');
         });
    });
 // Test cases for /screening/prisma-diagram
    describe('GET /screening/prisma-diagram', () => {
        it('should generate a PRISMA diagram', async () => {
             const response = await request(app)
                 .get(`/screening/prisma-diagram?project_id=${testProjectId}`)
               .set('Authorization', `Bearer ${authToken}`)
               expect(response.statusCode).toBe(200);
              expect(response.body).toHaveProperty('mermaid_diagram');
         });
        it('should not generate prisma diagram if project id is invalid', async () => {
            const response = await request(app)
                 .get(`/screening/prisma-diagram?project_id=invalid-uuid`)
                .set('Authorization', `Bearer ${authToken}`)
            expect(response.statusCode).toBe(400);
           expect(response.body).toHaveProperty('message', 'Invalid project id format');
        });
    });
});