// backend/test/routes/userRoutes.test.js
const request = require('supertest');
const app = require('../../index'); // Assuming app is exported from your main server file
const pool = require('../../database'); // Database connection for mocking
const bcrypt = require('bcrypt');
const { mockDbResponse } = require('../testHelper')


jest.mock('../../utils', () => ({
    sendEmail: jest.fn(() => Promise.resolve('Email sent')),
     handleError: jest.fn((res, error, status, message) => {
        res.status(status).json({ message });
    }),
}));

describe('User Routes', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('POST /register', () => {
        it('should register a new user successfully', async () => {
            pool.query = mockDbResponse([[], { affectedRows: 1 }]);
            const res = await request(app).post('/register').send({
                username: 'johndoe',
                email: 'johndoe@example.com',
                password: 'Password123!',
                subscriptionOption: 'Individual',
                 studentId: '12345'
            });

            expect(res.status).toBe(201);
           expect(res.body).toHaveProperty('user_id');
             expect(res.body).toHaveProperty('username', 'johndoe');
              expect(res.body).toHaveProperty('email', 'johndoe@example.com');
             expect(pool.query).toHaveBeenCalledTimes(2);
         });

        it('should return error if username, email, or password is missing', async () => {
            const res = await request(app).post('/register').send({ email: 'johndoe@example.com' });
            expect(res.status).toBe(400);
           expect(res.body.message).toBe('Username, email and password and subscription type are required');
       });

         it('should return error for invalid email format', async () => {
            const res = await request(app).post('/register').send({
                username: 'johndoe',
                email: 'invalid-email',
               password: 'Password123!',
                 subscriptionOption: 'Individual',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid email format.');
        });
        it('should return error if password is less than 8 characters', async () => {
            const res = await request(app).post('/register').send({
                username: 'johndoe',
               email: 'johndoe@example.com',
                password: 'Pass1',
                  subscriptionOption: 'Individual',
            });

           expect(res.status).toBe(400);
            expect(res.body.message).toBe('Password must be at least 8 characters long.');
       });
      it('should return error for weak password', async () => {
         const res = await request(app).post('/register').send({
                username: 'johndoe',
                 email: 'johndoe@example.com',
              password: 'password',
                subscriptionOption: 'Individual',
           });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Password must be at least 8 characters long, have uppercase, lowercase, number, and special character');
      });
       it('should return error for short username', async () => {
            const res = await request(app).post('/register').send({
                username: 'jo',
                email: 'johndoe@example.com',
                password: 'Password123!',
               subscriptionOption: 'Individual',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Username must be at least 3 characters long.');
       });
         it('should return error for duplicate email or username', async () => {
             pool.query = mockDbResponse([[{ user_id: '123' }]]); // User exists
            const res = await request(app).post('/register').send({
                username: 'johndoe',
                 email: 'johndoe@example.com',
               password: 'Password123!',
                 subscriptionOption: 'Individual',
           });

           expect(res.status).toBe(400);
          expect(res.body.message).toBe('Email or username already registered.');
      });
    });

  describe('POST /login', () => {
    it('should log in successfully and return a token', async () => {
           const hashedPassword = await bcrypt.hash('Password123', 10);
         pool.query = mockDbResponse([[{ user_id: '123', hashed_password: hashedPassword, role: 'admin' }]])
            const res = await request(app).post('/login').send({
                usernameEmail: 'johndoe@example.com',
                password: 'Password123',
             });

          expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
             expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('user_id', '123');
         expect(res.body.user).toHaveProperty('role', 'admin');
       });
     it('should return error for invalid credentials', async () => {
         pool.query = mockDbResponse([[]])
            const res = await request(app).post('/login').send({
                usernameEmail: 'unknown@example.com',
                password: 'Password123',
           });
          expect(res.status).toBe(401);
           expect(res.body.message).toBe('Invalid login credentials.');
       });
      it('should return error if usernameEmail or password is not provided', async () => {
          const res = await request(app).post('/login').send({ password: 'Password123' });
           expect(res.status).toBe(400);
           expect(res.body.message).toBe('Username or Email and password are required');
       });
    });

     describe('POST /logout', () => {
          it('should blacklist token successfully on logout', async () => {
            pool.query = mockDbResponse([{ affectedRows: 1 }], 2)
           const res = await request(app)
              .post('/logout')
              .set('Authorization', 'Bearer validToken');

             expect(res.status).toBe(200);
           expect(res.body.message).toBe('Logged out successfully.');
          expect(pool.query).toHaveBeenCalledTimes(2);
       });
         it('should return error if no token is provided', async () => {
           const res = await request(app).post('/logout');
          expect(res.status).toBe(401);
         expect(res.body.message).toBe('Access token missing.');
      });
    });

   describe('POST /reset-password-request', () => {
         it('should send password reset email', async () => {
            pool.query = mockDbResponse([[{ user_id: '123' }],{ affectedRows: 1 }]);
          const res = await request(app).post('/reset-password-request').send({ email: 'johndoe@example.com' });

           expect(res.status).toBe(200);
          expect(res.body.message).toBe('Password reset email sent.');
        });

        it('should return error for non-existent email', async () => {
          pool.query = mockDbResponse([[]]); // User not found
            const res = await request(app).post('/reset-password-request').send({ email: 'unknown@example.com' });

           expect(res.status).toBe(404);
           expect(res.body.message).toBe('User not found.');
       });
   });

     describe('POST /verify-reset-token', () => {
        it('should verify a valid token', async () => {
            pool.query = mockDbResponse([[{ user_id: '123' }]])
           const res = await request(app).post('/verify-reset-token').send({ token: 'validToken' });
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Valid token.');
        });

         it('should return error for invalid token', async () => {
          pool.query = mockDbResponse([[]])
            const res = await request(app).post('/verify-reset-token').send({ token: 'invalidToken' });
             expect(res.status).toBe(400);
             expect(res.body.message).toBe('Invalid or expired token.');
         });
    });

   describe('POST /reset-password', () => {
          it('should reset the password successfully', async () => {
              const hashedPassword = await bcrypt.hash('NewPassword123', 10);
              pool.query = mockDbResponse([[{ user_id: '123', expiration_timestamp: new Date(Date.now() + 60*60*1000) }], [{hashed_password: hashedPassword}], { affectedRows: 1 },{ affectedRows: 1 }]);
             const res = await request(app).post('/reset-password').send({
                token: 'validToken',
                  password: 'NewPassword123',
            });
             expect(res.status).toBe(200);
           expect(res.body.message).toBe('Password reset successfully.');
         });

         it('should return error for invalid or expired token', async () => {
          pool.query = mockDbResponse([[]]);
              const res = await request(app).post('/reset-password').send({
                  token: 'invalidToken',
                  password: 'NewPassword123',
            });
             expect(res.status).toBe(400);
              expect(res.body.message).toBe('Invalid or expired token.');
          });
      });
    describe('GET /profile', () => {
        it('should return user profile successfully', async () => {
          const user = { user_id: '123', username: 'johndoe', email: 'johndoe@example.com', role: 'reviewer', subscriptionOption: "Individual", studentId: null };
            pool.query = mockDbResponse([[user]])
            const res = await request(app)
               .get('/profile')
                .set('Authorization', 'Bearer validToken');
           expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('user_id', '123');
           expect(res.body).toHaveProperty('username', 'johndoe');
           expect(res.body).toHaveProperty('email', 'johndoe@example.com');
           expect(res.body).toHaveProperty('role', 'reviewer');
            expect(res.body).toHaveProperty('subscriptionOption', 'Individual');
           expect(res.body).toHaveProperty('studentId', null);

        });
        it('should return 404 if user does not exist', async () => {
           pool.query = mockDbResponse([[]]);
            const res = await request(app)
              .get('/profile')
              .set('Authorization', 'Bearer validToken');
           expect(res.status).toBe(404);
           expect(res.body.message).toBe('User not found.');
       });
        it('should return error for no token', async () => {
           const res = await request(app).get('/profile');
           expect(res.status).toBe(401);
           expect(res.body.message).toBe('Access token missing.');
        });
    });

     describe('PUT /profile', () => {
          it('should update user profile successfully', async () => {
             const user = { user_id: '123', username: 'newdoe', email: 'newdoe@example.com', role: 'reviewer', subscriptionOption: "Individual", studentId: null };
            pool.query = mockDbResponse([[],{ affectedRows: 1 },[user]])
           const res = await request(app)
               .put('/profile')
                .set('Authorization', 'Bearer validToken')
                .send({ username: 'newdoe', email: 'newdoe@example.com' });
          expect(res.status).toBe(200);
           expect(res.body).toHaveProperty('user_id', '123');
           expect(res.body).toHaveProperty('username', 'newdoe');
            expect(res.body).toHaveProperty('email', 'newdoe@example.com');
           expect(res.body).toHaveProperty('role', 'reviewer');
         expect(res.body).toHaveProperty('subscriptionOption', 'Individual');
           expect(res.body).toHaveProperty('studentId', null);
      });
        it('should return 404 if user does not exist', async () => {
           pool.query = mockDbResponse([[],{ affectedRows: 0 }])
           const res = await request(app)
             .put('/profile')
                .set('Authorization', 'Bearer validToken')
                .send({ username: 'newdoe', email: 'newdoe@example.com' });
            expect(res.status).toBe(404);
          expect(res.body.message).toBe('User not found.');
        });
        it('should return error for invalid email', async () => {
            const res = await request(app)
                 .put('/profile')
                  .set('Authorization', 'Bearer validToken')
                 .send({ username: 'newdoe', email: 'invalidEmail' });
            expect(res.status).toBe(400);
           expect(res.body.message).toBe('Invalid email format.');
     });
        it('should return error if email already registered', async () => {
             pool.query = mockDbResponse([[{user_id: '123'}]])
            const res = await request(app)
                .put('/profile')
               .set('Authorization', 'Bearer validToken')
                .send({ username: 'newdoe', email: 'newdoe@example.com' });
          expect(res.status).toBe(400);
           expect(res.body.message).toBe('Email already registered.');
       });
      });
    describe('GET /admin/users', () => {
         it('should return a list of users', async () => {
             const users = [{ user_id: '123', username: 'johndoe', email: 'johndoe@example.com', role: 'reviewer' }];
              pool.getAllRecord = mockDbResponse([users])
             const res = await request(app)
                .get('/admin/users')
              .set('Authorization', 'Bearer validToken');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ user_id: '123', username: 'johndoe', email: 'johndoe@example.com', role: 'reviewer' })]));
       });
       it('should return error if no token provided', async () => {
            const res = await request(app).get('/admin/users');
           expect(res.status).toBe(401);
           expect(res.body.message).toBe('Access token missing.');
       });
    });
    describe('GET /admin/users/:user_id', () => {
       it('should return details of a user by user id', async () => {
             const user = { user_id: '123', username: 'johndoe', email: 'johndoe@example.com', role: 'reviewer' };
            pool.getRecordById = mockDbResponse([[user]])
            const res = await request(app)
                .get('/admin/users/123')
                .set('Authorization', 'Bearer validToken');

           expect(res.status).toBe(200);
             expect(res.body).toHaveProperty('user_id', '123');
           expect(res.body).toHaveProperty('username', 'johndoe');
            expect(res.body).toHaveProperty('email', 'johndoe@example.com');
      });
        it('should return error when user is not found', async () => {
          pool.getRecordById= mockDbResponse([null]);
             const res = await request(app)
                .get('/admin/users/123')
                .set('Authorization', 'Bearer validToken');

            expect(res.status).toBe(404);
             expect(res.body.message).toBe('User not found.');
      });
      it('should return 401 when no token provided', async () => {
           const res = await request(app).get('/admin/users/123');
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Access token missing.');
      });
   });
    describe('PUT /admin/users/:user_id', () => {
       it('should update a specific user successfully', async () => {
           const updatedUser = { user_id: '123', username: 'newdoe', email: 'newdoe@example.com', role: 'admin' }
           pool.query = mockDbResponse([[], { affectedRows: 1}, [updatedUser]]);

          const res = await request(app)
              .put('/admin/users/123')
                .set('Authorization', 'Bearer validToken')
                .send({ username: 'newdoe', email: 'newdoe@example.com', role: 'admin' });

           expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('user_id', '123');
          expect(res.body).toHaveProperty('username', 'newdoe');
          expect(res.body).toHaveProperty('email', 'newdoe@example.com');
            expect(res.body).toHaveProperty('role', 'admin');
       });
        it('should return 404 if user does not exist', async () => {
            pool.query = mockDbResponse([[],{ affectedRows: 0 }])
          const res = await request(app)
                 .put('/admin/users/123')
               .set('Authorization', 'Bearer validToken')
                .send({ username: 'newdoe', email: 'newdoe@example.com', role: 'admin' });

            expect(res.status).toBe(404);
           expect(res.body.message).toBe('User not found.');
       });
         it('should return error when email is invalid', async () => {
           const res = await request(app)
                .put('/admin/users/123')
                .set('Authorization', 'Bearer validToken')
                 .send({ username: 'newdoe', email: 'invalidEmail', role: 'admin' });
           expect(res.status).toBe(400);
           expect(res.body.message).toBe('Invalid email format.');
        });
           it('should return error when email is already registered', async () => {
            pool.query = mockDbResponse([[{ user_id: '123' }]])
             const res = await request(app)
                 .put('/admin/users/123')
                 .set('Authorization', 'Bearer validToken')
                  .send({ username: 'newdoe', email: 'newdoe@example.com', role: 'admin' });
           expect(res.status).toBe(400);
            expect(res.body.message).toBe('Email already registered.');
          });
      });
        describe('DELETE /admin/users/:user_id', () => {
           it('should delete a specific user using user ID', async () => {
            pool.deleteRecord = mockDbResponse([{affectedRows: 1}]);
               const res = await request(app)
                 .delete('/admin/users/123')
                 .set('Authorization', 'Bearer validToken');

            expect(res.status).toBe(200);
           expect(res.body.message).toBe('User deleted successfully.');
          });
         it('should return 404 when user does not exist', async () => {
            pool.deleteRecord= mockDbResponse([{ affectedRows: 0 }]);
           const res = await request(app)
               .delete('/admin/users/123')
                .set('Authorization', 'Bearer validToken');

           expect(res.status).toBe(404);
           expect(res.body.message).toBe('User not found.');
        });
      });
     describe('PUT /admin/users/:user_id/roles', () => {
         it('should update role of a user successfully', async () => {
            const updatedUser = { user_id: '123', role: 'admin' }
              pool.query = mockDbResponse([{ affectedRows: 1 }, [updatedUser]]);
              const res = await request(app)
                  .put('/admin/users/123/roles')
                   .set('Authorization', 'Bearer validToken')
                 .send({ role: 'admin' });
             expect(res.status).toBe(200);
              expect(res.body).toHaveProperty('user_id', '123');
           expect(res.body).toHaveProperty('role', 'admin');
        });
        it('should return error when user is not found', async () => {
           pool.query=mockDbResponse([{ affectedRows: 0 }])
           const res = await request(app)
                 .put('/admin/users/123/roles')
                .set('Authorization', 'Bearer validToken')
               .send({ role: 'admin' });
           expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found.');
        });
    });
});