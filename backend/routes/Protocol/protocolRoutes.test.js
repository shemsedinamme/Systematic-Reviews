const request = require('supertest');
const app = require('../index'); // Assuming your main app file is in the root
const pool = require('../database');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');


describe('Protocol Routes', () => {
  let authToken; // Declare authToken at a higher scope
 let testProjectId;
    let testTemplateId;
  beforeAll(async () => {
    // Create a test user and get the authentication token
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

    it('should create a new protocol', async () => {
      const response = await request(app)
        .post('/protocols')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
           template_id: testTemplateId,
          project_id: testProjectId,
          title: 'Test Protocol'
         });
    expect(response.statusCode).toBe(201);
         expect(response.body).toHaveProperty('protocol_id');
           expect(response.body).toHaveProperty('title', 'Test Protocol');
    });

    it('should fetch all protocols', async () => {
        const response = await request(app)
           .get('/protocols')
            .set('Authorization', `Bearer ${authToken}`)
          expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

     it('should not create a new protocol if required parameters are missing.', async () => {
      const response = await request(app)
        .post('/protocols')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: testProjectId,
         });
       expect(response.statusCode).toBe(400);
         expect(response.body).toHaveProperty('message', 'Template id and title are required.');
    });
     it('should fetch all templates', async () => {
        const response = await request(app)
           .get('/templates')
             .set('Authorization', `Bearer ${authToken}`)
          expect(response.statusCode).toBe(200);
         expect(Array.isArray(response.body)).toBeTruthy();
    });

    it('should create a new template', async () => {
      const response = await request(app)
        .post('/templates')
         .set('Authorization', `Bearer ${authToken}`)
        .send({
          template_name: 'Test Template 2',
           template_description: 'This is a test template description.'
        });
      expect(response.statusCode).toBe(201);
          expect(response.body).toHaveProperty('template_id')
             expect(response.body).toHaveProperty('template_name', 'Test Template 2')
              expect(response.body).toHaveProperty('template_description', 'This is a test template description.')
    });
    it('should not create a new template if required parameters are missing', async () => {
      const response = await request(app)
        .post('/templates')
          .set('Authorization', `Bearer ${authToken}`)
        .send({
          template_description: 'This is a test template description.'
        });
        expect(response.statusCode).toBe(400)
          expect(response.body).toHaveProperty('message','Template name is required.')
    });
});