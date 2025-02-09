// adminUserRoutes.test.js
const request = require('supertest');
const app = require('../app'); // Assuming app is exported from your main server file
const pool = require('../database'); // Database connection for mocking
const { mockDbResponse } = require('./testHelper')


jest.mock('../utils', () => ({
    sendEmail: jest.fn(() => Promise.resolve('Email sent')),
     handleError: jest.fn((res, error, status, message) => {
        res.status(status).json({ message });
     }),
}));

describe('Admin User Routes', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
       await pool.end();
    });
    describe('GET /admin/roles', () => {
        it('should return a list of roles', async () => {
              const roles = [{ role_id: '123', role_name: 'admin' }, { role_id: '456', role_name: 'reviewer' }]
            pool.query = mockDbResponse([roles])
           const res = await request(app)
                .get('/admin/roles')
              .set('Authorization', 'Bearer validToken');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(expect.arrayContaining([
                expect.objectContaining({ role_id: '123', role_name: 'admin' }),
                  expect.objectContaining({ role_id: '456', role_name: 'reviewer' }),
            ]));
        });
        it('should return 401 error if token is not provided', async () => {
              const res = await request(app)
               .get('/admin/roles')
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Access token missing.');
        });
    });
      describe('POST /admin/roles', () => {
          it('should create a new role successfully', async () => {
            pool.query = mockDbResponse([{ affectedRows: 1 }]);
            const res = await request(app)
                .post('/admin/roles')
                .set('Authorization', 'Bearer validToken')
                .send({ role_name: 'data_extractor' });
             expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('role_id');
            expect(res.body).toHaveProperty('role_name', 'data_extractor');
        });
         it('should return 400 if role_name is missing', async () => {
            const res = await request(app)
                .post('/admin/roles')
                 .set('Authorization', 'Bearer validToken');
            expect(res.status).toBe(400);
           expect(res.body.message).toBe('Role name is required');
        });
          it('should return 401 error if token is not provided', async () => {
            const res = await request(app)
                .post('/admin/roles')
           expect(res.status).toBe(401);
            expect(res.body.message).toBe('Access token missing.');
        });
    });
      describe('PUT /admin/roles/:role_id', () => {
         it('should update a role successfully', async () => {
           const updatedRole = { role_id: '123', role_name: 'admin_new' };
          pool.query = mockDbResponse([{ affectedRows: 1 },[updatedRole]]);
           const res = await request(app)
                .put('/admin/roles/123')
               .set('Authorization', 'Bearer validToken')
                .send({ role_name: 'admin_new' });
            expect(res.status).toBe(200);
           expect(res.body).toHaveProperty('role_id', '123');
         expect(res.body).toHaveProperty('role_name', 'admin_new');
        });
         it('should return 404 if role is not found', async () => {
            pool.query = mockDbResponse([{ affectedRows: 0 }]);
            const res = await request(app)
                .put('/admin/roles/123')
                .set('Authorization', 'Bearer validToken')
                .send({ role_name: 'admin_new' });
           expect(res.status).toBe(404);
            expect(res.body.message).toBe('Role not found.');
        });
          it('should return 400 if role_name is missing', async () => {
           const res = await request(app)
                .put('/admin/roles/123')
               .set('Authorization', 'Bearer validToken');
            expect(res.status).toBe(400);
           expect(res.body.message).toBe('Role name is required');
      });
    });
    describe('DELETE /admin/roles/:role_id', () => {
        it('should delete the role by role_id successfully', async () => {
             pool.query = mockDbResponse([{ affectedRows: 1 }]);
             const res = await request(app)
                .delete('/admin/roles/123')
                 .set('Authorization', 'Bearer validToken');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Role deleted successfully.');
        });
        it('should return 404 if role is not found', async () => {
             pool.query = mockDbResponse([{ affectedRows: 0 }]);
            const res = await request(app)
               .delete('/admin/roles/123')
               .set('Authorization', 'Bearer validToken');
           expect(res.status).toBe(404);
          expect(res.body.message).toBe('Role not found.');
       });
    });
});