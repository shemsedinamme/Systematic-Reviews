const request = require('supertest');
const express = require('express');
const router = require('../qualityAssessmentRoutes'); // Assuming your routes file is here
const { authenticateToken, authorizeRole } = require('../authMiddleware'); // Import your auth middleware
const { validationResult } = require('express-validator');
const pool = require('../database');

// Mock the database pool
jest.mock('../database', () => ({
    query: jest.fn(),
    getConnection: jest.fn(()=>({
       query: jest.fn(),
       release: jest.fn()
    })),
}));

// Mock the auth middleware
jest.mock('../authMiddleware', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { user_id: 'testuser', role: 'admin' }; // Mock the user information
        next();
    },
    authorizeRole: (roles) => (req, res, next) => {
        if (roles.includes(req.user.role)) {
           next();
        } else {
            res.status(403).send('Forbidden');
        }
     }
}));

// Create an express app and use the route
const app = express();
app.use(express.json());
app.use(router);


describe('Quality Assessment Risk of Bias Tools API Endpoints', () => {
    afterEach(() => {
        jest.clearAllMocks();
     });

    describe('GET /quality-assessment/risk-of-bias/tools', () => {
      it('should fetch all risk of bias tools', async () => {
         pool.query.mockResolvedValueOnce([
             [
                { criterion_id: '1', criterion_name: 'Tool 1', criterion_description: 'Description 1', criterion_type: 'bias' },
                { criterion_id: '2', criterion_name: 'Tool 2', criterion_description: 'Description 2', criterion_type: 'quality' }
             ]
         ]);
            const response = await request(app).get('/quality-assessment/risk-of-bias/tools');
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        tool_id: expect.any(String),
                        tool_name: expect.any(String),
                        tool_description: expect.any(String),
                        tool_type: expect.any(String)
                    })
                ])
            );
          expect(pool.query).toHaveBeenCalledTimes(1)
         });

      it('should return 500 for database error', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database Error'));
        const response = await request(app).get('/quality-assessment/risk-of-bias/tools');
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({message: 'Failed to fetch risk of bias assessment tools.'});
      });
    });

    describe('POST /quality-assessment/risk-of-bias/tools', () => {
        it('should create a new risk of bias tool', async () => {
           const newTool = {
               tool_name: 'Test Tool',
                tool_description: 'Test Description',
                 tool_type: 'bias'
            };

            pool.query.mockResolvedValueOnce([{insertId: 'new-uuid'}])
            const response = await request(app)
                .post('/quality-assessment/risk-of-bias/tools')
                .send(newTool);

            expect(response.statusCode).toBe(201);
            expect(response.body).toEqual(
                expect.objectContaining({
                  tool_id: expect.any(String),
                  tool_name: 'Test Tool',
                   tool_description: 'Test Description',
                   tool_type: 'bias'
                })
            );
            expect(pool.query).toHaveBeenCalledTimes(1)
       });

      it('should return 400 for validation errors', async () => {
        const response = await request(app)
            .post('/quality-assessment/risk-of-bias/tools')
          .send({});
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('message');
       });

      it('should return 500 for database error', async () => {
           pool.query.mockRejectedValueOnce(new Error('Database Error'))
          const newTool = {
            tool_name: 'Test Tool',
             tool_description: 'Test Description',
              tool_type: 'bias'
            };
          const response = await request(app)
            .post('/quality-assessment/risk-of-bias/tools')
             .send(newTool);
        expect(response.statusCode).toBe(500);
          expect(response.body).toEqual({message: 'Failed to create a new risk of bias assessment tool.'});
      });

    });

   describe('GET /quality-assessment/risk-of-bias/tools/:tool_id', () => {
        it('should fetch a specific risk of bias tool by id', async () => {
          pool.query.mockResolvedValueOnce([[{ criterion_id: '1', criterion_name: 'Tool 1', criterion_description: 'Description 1', criterion_type: 'bias' }]]);
            const response = await request(app).get('/quality-assessment/risk-of-bias/tools/1');
            expect(response.statusCode).toBe(200);
          expect(response.body).toEqual(
                expect.objectContaining({
                  tool_id: expect.any(String),
                  tool_name: expect.any(String),
                   tool_description: expect.any(String),
                    tool_type: expect.any(String)
                })
            );
            expect(pool.query).toHaveBeenCalledTimes(1)
      });

      it('should return 404 for tool not found', async () => {
         pool.query.mockResolvedValueOnce([[]]);
          const response = await request(app).get('/quality-assessment/risk-of-bias/tools/1');
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({message: 'Tool with id 1 not found.'})
       });

      it('should return 500 for database error', async () => {
           pool.query.mockRejectedValueOnce(new Error('Database Error'))
           const response = await request(app).get('/quality-assessment/risk-of-bias/tools/1');
        expect(response.statusCode).toBe(500);
            expect(response.body).toEqual({ message: 'Failed to fetch risk of bias assessment tool.' });
       });
   });

   describe('PUT /quality-assessment/risk-of-bias/tools/:tool_id', () => {
      it('should update a specific risk of bias tool by id', async () => {
          const updatedTool = {
              tool_name: 'Updated Tool',
              tool_description: 'Updated Description',
               tool_type: 'quality'
            };
          pool.query.mockResolvedValueOnce([{affectedRows: 1}])
          pool.query.mockResolvedValueOnce([[{ criterion_id: '1', criterion_name: 'Updated Tool', criterion_description: 'Updated Description', criterion_type: 'quality' }]]);
            const response = await request(app)
                .put('/quality-assessment/risk-of-bias/tools/1')
               .send(updatedTool);
         expect(response.statusCode).toBe(200);
            expect(response.body).toEqual(
                expect.objectContaining({
                  tool_id: expect.any(String),
                  tool_name: 'Updated Tool',
                   tool_description: 'Updated Description',
                   tool_type: 'quality'
                 })
            );
             expect(pool.query).toHaveBeenCalledTimes(2)
        });
     it('should return 400 for validation errors', async () => {
        const response = await request(app)
            .put('/quality-assessment/risk-of-bias/tools/1')
           .send({});
          expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');
       });
      it('should return 404 for tool not found', async () => {
           pool.query.mockResolvedValueOnce([[]]);
          const response = await request(app)
              .put('/quality-assessment/risk-of-bias/tools/1')
           .send({
             tool_name: 'Updated Tool',
             tool_description: 'Updated Description',
               tool_type: 'quality'
           });
         expect(response.statusCode).toBe(404);
          expect(response.body).toEqual({message: 'Tool with id 1 not found.'})
       });
      it('should return 500 for database error', async () => {
         pool.query.mockRejectedValueOnce(new Error('Database Error'))
        const updatedTool = {
           tool_name: 'Updated Tool',
           tool_description: 'Updated Description',
            tool_type: 'quality'
        };
        const response = await request(app)
          .put('/quality-assessment/risk-of-bias/tools/1')
        .send(updatedTool);
         expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({message: 'Failed to update risk of bias assessment tool.'});
      });
    });
    describe('DELETE /quality-assessment/risk-of-bias/tools/:tool_id', () => {
      it('should delete a specific risk of bias tool by id', async () => {
         pool.query.mockResolvedValueOnce([{ affectedRows: 1}])
            const response = await request(app).delete('/quality-assessment/risk-of-bias/tools/1');
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({message: 'Tool with id 1 deleted successfully.'});
         expect(pool.query).toHaveBeenCalledTimes(1)
      });
      it('should return 404 for tool not found', async () => {
         pool.query.mockResolvedValueOnce([[]]);
          const response = await request(app).delete('/quality-assessment/risk-of-bias/tools/1');
          expect(response.statusCode).toBe(404);
           expect(response.body).toEqual({message: 'Tool with id 1 not found.'})
      });
        it('should return 500 for database error', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database Error'))
          const response = await request(app).delete('/quality-assessment/risk-of-bias/tools/1');
         expect(response.statusCode).toBe(500);
         expect(response.body).toEqual({message: 'Failed to delete risk of bias assessment tool.'});
      });
    });
});