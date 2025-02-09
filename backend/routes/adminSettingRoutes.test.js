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
      } else {
        return res.sendStatus(403);
       }
    }
}));

describe('Admin Routes', () => {
    beforeEach(async () => {
       await pool.query('DELETE FROM system_settings');
    });

    afterAll(async () => {
        await pool.end();
    });

    it('should get a list of roles', async () => {
        const response = await request(app)
            .get('/admin/roles')
            .set('Authorization', 'Bearer test-token')
            .expect(200);
        expect(response.body).toBeInstanceOf(Array);
       expect(response.body.length).toBe(2);
    });
    it('should create a new role', async () => {
         const newRole = {
             role_name: 'data_extractor',
         }
      const response = await request(app)
            .post('/admin/roles')
              .set('Authorization', 'Bearer test-token')
             .send(newRole)
           .expect(201);
         expect(response.body).toHaveProperty('role_id');
         expect(response.body).toHaveProperty('role_name', newRole.role_name);
    });
     it('should return 400 error when creating a new role without providing a role_name', async () => {
        const response = await request(app)
            .post('/admin/roles')
            .set('Authorization', 'Bearer test-token')
           .send({})
            .expect(400);
         expect(response.body).toHaveProperty('message', 'Role name is required');
    });
 it('should update a specific role', async () => {
         const newRole = {
             role_name: 'data_extractor',
         }
       const createdRole = await request(app)
          .post('/admin/roles')
          .set('Authorization', 'Bearer test-token')
            .send(newRole)
            .expect(201);

         const updateRole = {
            role_name: 'data_reviewer'
         }

        const response = await request(app)
           .put(`/admin/roles/${createdRole.body.role_id}`)
              .set('Authorization', 'Bearer test-token')
            .send(updateRole)
          .expect(200);
        expect(response.body).toHaveProperty('role_id', createdRole.body.role_id);
       expect(response.body).toHaveProperty('role_name', updateRole.role_name)
    });
     it('should return 404 when updating a non existing role', async () => {
            const updateRole = {
                 role_name: 'data_reviewer'
            }
         const response = await request(app)
            .put(`/admin/roles/non-existing-role`)
            .set('Authorization', 'Bearer test-token')
             .send(updateRole)
            .expect(404);
         expect(response.body).toHaveProperty('message', 'Role not found.')
    });
    it('should delete a specific role successfully', async () => {
      const newRole = {
            role_name: 'data_extractor',
        }
     const createdRole = await request(app)
           .post('/admin/roles')
           .set('Authorization', 'Bearer test-token')
           .send(newRole)
           .expect(201);
     const response = await request(app)
            .delete(`/admin/roles/${createdRole.body.role_id}`)
             .set('Authorization', 'Bearer test-token')
          .expect(200);
         expect(response.body).toHaveProperty('message', 'Role deleted successfully.');
  });
  it('should return 404 error when deleting non existing role', async () => {
      const response = await request(app)
            .delete('/admin/roles/non-existing-role')
            .set('Authorization', 'Bearer test-token')
            .expect(404);
         expect(response.body).toHaveProperty('message', 'Role not found.')
   });
     it('should get system settings', async () => {
        const response = await request(app)
            .get('/admin/settings')
            .set('Authorization', 'Bearer test-token')
            .expect(200);
        expect(response.body).toHaveProperty('settings');
    });
   it('should update system settings successfully', async () => {
       const newSettings = {
            settings: '{"email_notifications": true, "default_language": "en"}'
       };
       const response = await request(app)
            .post('/admin/settings')
            .set('Authorization', 'Bearer test-token')
            .send(newSettings)
            .expect(200);
         expect(response.body).toHaveProperty('message', 'Settings updated successfully')
    });
   it('should configure the database using api endpoint', async () => {
         const dbConfig = {
             database_host: 'localhost:5432',
              database_user: 'postgres',
            database_password: 'password123',
             database_name: 'reviewhubdb',
            database_port: '3306'
        }
        const response = await request(app)
            .post('/admin/database')
            .set('Authorization', 'Bearer test-token')
            .send(dbConfig)
            .expect(200);
        expect(response.body).toHaveProperty('message', 'Database configurations updated successfully.');
   });
    it('should configure thrid party integration using api endpoint', async () => {
           const integrationData = {
              integration_type: "google_docs",
             integration_settings: "{'clientId':'xyz', 'clientSecret':'abc'}"
          }
        const response = await request(app)
            .post('/admin/integration')
           .set('Authorization', 'Bearer test-token')
            .send(integrationData)
          .expect(200);
      expect(response.body).toHaveProperty('message', 'Integration settings saved successfully');
  });
});