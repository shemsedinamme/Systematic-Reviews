// userRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./database');
const { v4: uuidv4 } = require('uuid');
const { sendEmail, handleError } = require('./utils');
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const User = require('../models/user.model');
const Role = require('../models/role.model');
require('dotenv').config();
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username of the user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email of the user
 *               password:
 *                 type: string
 *                 description: The password of the user
 *               subscriptionOption:
 *                  type: string
 *                  description: The subcription type of the user.
 *               studentId:
 *                  type: string
 *                  description: The student id of the user if a student
 *               idCard:
 *                 type: string
 *                 format: binary
 *                 description: the id card of student to upload
 *             example:
 *               username: johndoe
 *               email: johndoe@example.com
 *               password: Password123
 *               subscriptionOption: Individual
 *               studentId: 12345
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                   description: unique id of the user
 *                 username:
 *                    type: string
 *                    description: user name of the user
 *                 email:
 *                    type: string
 *                    description: email address of the user
 *             example:
 *               user_id: 3a821c3c-5102-4379-a184-516d3591997b
 *               username: johndoe
 *               email: johndoe@example.com
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *             example:
 *               message: 'Username, email and password are required'
 *       500:
 *         description: Internal server error
 *         content:
 *            application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *             example:
 *               message: 'Registration failed.'
 */
const createUser = async (userData) => { // Create a helper method to create a new user
    const { username, email, password, subscriptionOption, studentId } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        user_id: uuidv4(),
        username: username,
        email: email,
        hashed_password: hashedPassword,
        subscriptionOption: subscriptionOption,
        studentId: studentId
    });
    try {
        const result = await pool.insertRecord('users', newUser, [
            'user_id',
            'username',
            'email',
            'hashed_password',
            'subscriptionOption',
            'studentId'
        ]);
        if (!result) {
            throw new Error('Failed to register new user.');
        }
        return new User(newUser);
    } catch (error) {
        console.error("Error during user registration", error);
        throw error; // rethrow error with specific message
    }
}
router.post('/register', upload.single('idCard'), async (req, res) => {
    const { username, email, password, subscriptionOption, studentId } = req.body;
     if(!username || !email || !password || !subscriptionOption) return res.status(400).json({message: 'Username, email, password, and subscription type are required'});
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({message:'Password must be at least 8 characters long, have uppercase, lowercase, number, and special character'})
    }
    if (username.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters long.' });
    }
    try {
        // Check if the email or username exists
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email or username already registered.' });
        }
        const registeredUser = await createUser(req.body);
        const emailContent = `Thank you for registering an account, ${username}! Your subscription type is ${subscriptionOption}, Student Id is ${studentId || ''}`
        await sendEmail({
            to: email,
            subject: 'New User Registration Confirmation',
            body: emailContent
        })
        await sendEmail({
            to: 'admin@reviewhub.net.et',
            subject: 'New User Registration Confirmation',
            body: `A new user has registered. Username:${username}, Email: ${email}. Subscription type:${subscriptionOption}, Student Id: ${studentId || ''}`
        })
        res.status(201).json(registeredUser.toJSON());
    } catch (error) {
        console.error('Error during user registration:', error);
       res.status(500).json({ message: 'Registration failed.' });
    }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     description: Authenticates user and returns jwt token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usernameEmail:
 *                 type: string
 *                 description: The username or email of the user
 *               password:
 *                 type: string
 *                 description: The password of the user
 *             example:
 *               usernameEmail: "johndoe@example.com"
 *               password: "Password123"
 *     responses:
 *       200:
 *         description: Logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                    type: string
 *                    description: A JWT for user authentication and authorization
 *       401:
 *         description: Unauthorized. User credentials are not correct.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *             example:
 *               message: 'Invalid login credentials.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *             example:
 *               message: 'Login failed.'
 */
router.post('/login', async (req, res) => {
    const { usernameEmail, password } = req.body;
     if(!usernameEmail || !password) return res.status(400).json({message: 'Username or Email and password are required'});
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [usernameEmail, usernameEmail]);
       if (user.length === 0) return res.status(401).json({ message: 'Invalid login credentials.' });
        const validPassword = await bcrypt.compare(password, user[0].hashed_password);
       if (!validPassword) {
           return res.status(401).json({ message: 'Invalid login credentials.' });
      }
        const token = jwt.sign(
            { user_id: user[0].user_id, role: user[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
         const userObj = new User(user[0]);
        res.status(200).json({ token: token, user: userObj.toJSON() });
    } catch (error) {
      console.error('Error during user login:', error);
       res.status(500).json({ message: 'Login failed.' });
    }
});
/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieves user profile by user ID.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                   description: The unique identifier of the user
 *                 username:
 *                   type: string
 *                   description: User name of the user.
 *                 email:
 *                   type: string
 *                   description: Email of the user.
 *                 role:
 *                   type: string
 *                   description: Role of the user.
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'User not found.'
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
 *               message: 'Failed to fetch user profile.'
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await pool.getRecordById('users', req.user.user_id, 'user_id', User);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' })
        }
       res.status(200).json(user.toJSON());
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Failed to fetch user profile.' });
    }
});
/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Update user profile
 *     description: Updates user profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: updated username
 *               email:
 *                 type: string
 *                 format: email
 *                 description: updated email.
 *             example:
 *               username: johndoe
 *               email: johndoe@example.com
 *     responses:
 *       200:
 *         description: User profile updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                   description: The unique identifier of the user
 *                 username:
 *                   type: string
 *                   description: User name of the user.
 *                 email:
 *                   type: string
 *                   description: Email of the user.
 *                 role:
 *                   type: string
 *                   description: Role of the user.
 *       404:
 *          description: User not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'User not found.'
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
 *               message: 'Failed to update user profile.'
 */
router.put('/profile', authenticateToken, async (req, res) => {
    const { username, email } = req.body;
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
      }
    try {
      const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? AND user_id != ?', [email, req.user.user_id]);
        if (existingUser.length > 0) {
          return res.status(400).json({ message: 'Email already registered.' });
        }
         const updateData = {
           username,
            email
        }
        const updatedUser = await pool.updateRecord('users', updateData, req.user.user_id, 'user_id', ['username', 'email']);
       if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' })
       }
      const user = await pool.getRecordById('users', req.user.user_id, 'user_id', User);
         res.status(200).json(user.toJSON());
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Failed to update user profile.' });
    }
});
/**
 * @swagger
 * /reset-password-request:
 *   post:
 *     summary: Initiates a reset password request
 *     description: Sends email to user for password reset.
 *     requestBody:
 *        required: true
 *        content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: The email of the user requesting password reset
 *             example:
 *               email: "johndoe@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: response message from the system.
 *             example:
 *               message: 'Password reset email sent.'
 *       404:
 *          description: User not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'User not found.'
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
 *               message: 'Password reset failed'
 */
router.post('/reset-password-request', async (req, res) => {
     const { email } = req.body;
    try {
        const [user] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
       if (user.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
       }
        const resetToken = uuidv4()
        const expirationTimestamp = new Date(Date.now() + 60 * 60 * 1000); //token valid for one hour
        await pool.query('INSERT INTO password_reset_tokens (token, user_id, expiration_timestamp) VALUES (?, ?, ?)', [resetToken, user[0].user_id, expirationTimestamp]);
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
        await sendEmail({
            to: email,
            subject: 'Password Reset Request',
            body: `Please use the following link to reset your password: ${resetLink}. This link will expire in one hour`,
        });
         res.status(200).json({message:'Password reset email sent.'});
   } catch (error) {
      console.error('Error during password reset request:', error);
         res.status(500).json({ message: 'Password reset failed' });
    }
});
/**
 * @swagger
 * /verify-reset-token:
 *   post:
 *     summary: Verify the reset token
 *     description: Verifies if a reset token is valid and not expired
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                  type: string
 *                  description: The token to verify.
 *             example:
 *                token: "9757a492-6980-434b-8a36-4b5a64ba3c21"
 *     responses:
 *       200:
 *         description: Valid token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Valid token.'
 *       400:
 *          description: Invalid or expired token.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Invalid or expired token'
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
 *               message: 'Password reset failed'
 */
router.post('/verify-reset-token', async (req, res) => {
    const { token } = req.body;
    try {
        const [resetToken] = await pool.query('SELECT * FROM password_reset_tokens WHERE token = ? AND expiration_timestamp > NOW()', [token]);
        if (resetToken.length === 0)
            return res.status(400).json({ message: 'Invalid or expired token' });
        res.status(200).json({ message: 'Valid token.' })
    } catch (error) {
        console.error('Error verifying token:', error);
       res.status(500).json({ message: 'Password reset failed' });
    }
});
/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Resets user's password after verifying reset token, and deletes the token.
 *     requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                token:
 *                  type: string
 *                  description: The token for password reset verification.
 *                password:
 *                   type: string
 *                   description: The new password for user.
 *             example:
 *                token: "9757a492-6980-434b-8a36-4b5a64ba3c21"
 *                password: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: response message from the system.
 *             example:
 *               message: 'Password reset successfully.'
 *       400:
 *          description: Invalid or expired token.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Invalid or expired token'
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
 *               message: 'Password reset failed.'
 */
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
   try {
       const [resetToken] = await pool.query('SELECT * FROM password_reset_tokens WHERE token = ? AND expiration_timestamp > NOW()', [token]);
       if (resetToken.length === 0)
           return res.status(400).json({ message: 'Invalid or expired token' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'UPDATE users SET hashed_password = ? WHERE user_id = ?',
             [hashedPassword, resetToken[0].user_id]
        );
      await pool.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
         res.status(200).json({ message: 'Password reset successfully.' });
   } catch (error) {
        console.error('Error during password reset:', error);
      res.status(500).json({ message: 'Password reset failed.' });
  }
});
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Retrieve a list of users
 *     description: Retrieves all users of the application. Only available for admin users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                     user_id:
 *                        type: string
 *                        description: The id of the user.
 *                     username:
 *                        type: string
 *                        description: user name of the user
 *                     email:
 *                       type: string
 *                       description: The email of the user
 *                     role:
 *                       type: string
 *                       description: The role of the user
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
 *               message: 'Failed to retrieve users'
 */
router.get('/admin/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
   try {
     const users = await pool.getAllRecord('users', User);
       res.status(200).json(users.map(user => user.toJSON()));
    } catch (error) {
     console.error('Error listing users:', error);
      res.status(500).json({ message: 'Failed to retrieve users' });
    }
});
/**
 * @swagger
 * /admin/users/{user_id}:
 *   get:
 *     summary: Get user details using user id
 *     description: Gets user details of a specific user using user id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *        - in: path
 *          name: user_id
 *          required: true
 *          description: ID of the user to retrieve.
 *          schema:
 *            type: string
 *     responses:
 *       200:
 *         description: User details fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    user_id:
 *                        type: string
 *                        description: The id of the user.
 *                     username:
 *                        type: string
 *                        description: User name of the user
 *                     email:
 *                       type: string
 *                       description: The email of the user
 *                     role:
 *                       type: string
 *                       description: The role of the user
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'User not found.'
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
 *               message: 'Failed to fetch user details.'
 */
router.get('/admin/users/:user_id', authenticateToken, authorizeRole('admin'), async (req, res) => {
     const { user_id } = req.params;
    try {
        const user = await pool.getRecordById('users', user_id, 'user_id', User);
        if (!user) return res.status(404).json({ message: 'User not found.' });
      res.status(200).json(user.toJSON());
    } catch (error) {
        console.error('Error getting user details:', error);
      res.status(500).json({ message: 'Failed to fetch user details.' });
    }
});
/**
 * @swagger
 * /admin/users/{user_id}:
 *   put:
 *     summary: Update a specific user by id
 *     description: Update a specific user based on id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: ID of the user to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                username:
 *                  type: string
 *                  description: Updated username for the user
 *                email:
 *                  type: string
 *                  format: email
 *                  description: Updated email of the user
 *                role:
 *                  type: string
 *                  description: The new role for the user
 *             example:
 *                 username: "new-johndoe"
 *                 email: "new-johndoe@example.com"
 *                 role: "reviewer"
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  user_id:
 *                     type: string
 *                     description: The unique identifier of the user.
 *                  username:
 *                     type: string
 *                     description: User name of the user.
 *                  email:
 *                     type: string
 *                     description: Email of the user.
 *                 role:
 *                    type: string
 *                    description: Role of the user
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'User not found.'
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
 *                message: 'Failed to update user.'
 */
router.put('/admin/users/:user_id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const { user_id } = req.params;
     const { username, email, role } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    try {
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? AND user_id != ?', [email, user_id]);
       if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }
        const updateData = {
             username,
            email,
           role
        }
        const updatedUser = await pool.updateRecord('users', updateData, user_id, 'user_id', ['username', 'email','role']);
         if(!updatedUser) return res.status(404).json({ message: 'User not found.' });
      const user = await pool.getRecordById('users', user_id, 'user_id', User);
        res.status(200).json(user.toJSON());
    } catch (error) {
        console.error('Error updating user:', error);
       res.status(500).json({ message: 'Failed to update user.' });
    }
});
/**
 * @swagger
 * /admin/users/{user_id}:
 *   delete:
 *     summary: Delete a specific user using user ID.
 *     description: Delete a specific user using its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: ID of the user to be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                     type: string
 *                     description: Message from system about deletion.
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'User not found.'
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
 *                message: 'Failed to delete user.'
 */
router.delete('/admin/users/:user_id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const { user_id } = req.params;
  try {
     const deletedUser =  await pool.deleteRecord('users', user_id, 'user_id');
         if(!deletedUser) return res.status(404).json({ message: 'User not found.' });
      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user.' });
   }
});

 /**
 * @swagger
 * /admin/users/{user_id}/roles:
 *  put:
 *     summary: Assign a role for user
 *     description: updates the role of a user based on user id, only admin role can perform this operation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: The id of the user to whom the new role will be assigned.
 *         schema:
 *           type: string
 *     requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                role:
 *                  type: string
 *                  description: The new role for the user (admin, lead_author, reviewer, data_extractor).
 *             example:
 *                role: "reviewer"
 *     responses:
 *       200:
 *         description: Role assigned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    user_id:
 *                      type: string
 *                      description: The id of the user
 *                    role:
 *                      type: string
 *                      description: New Role for user
 *       404:
 *          description: User not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                   message:
 *                      type: string
 *                      description: The message returned by the system.
 *              example:
 *                 message: 'User not found'
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
 *                message: 'Failed to assign the role.'
 */
router.put('/admin/users/:user_id/roles', authenticateToken, authorizeRole('admin') ,async (req, res) => {
    const { user_id } = req.params;
    const { role } = req.body;
  try {
      const updateData = {
          role: role
      };
      const updatedUser =  await pool.updateRecord('users', updateData, user_id, 'user_id', ['role']);
          if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
         const user = await pool.getRecordById('users', user_id, 'user_id', User);
      res.status(200).json(user.toJSON());
    } catch (error) {
      console.error('Error assigning role to user:', error);
        res.status(500).json({ message: 'Failed to assign the role.' });
    }
});


});
/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout user by blacklisting token
 *     description: Blacklists a token to prevent further access using that token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message confirming successful logout.
 *             example:
 *               message: 'Logged out successfully'
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
 *               message: 'Logout failed.'
 */
router.post('/logout', authenticateToken, async (req, res) => {
   const token = req.headers['authorization']?.split(' ')[1];
      try {
        const expirationTimestamp = new Date(Date.now() + 60 * 60 * 1000); //token valid for one hour
      await pool.query('INSERT INTO blacklisted_tokens (token, expiration_timestamp) VALUES (?, ?)', [token, expirationTimestamp]);
       res.status(200).json({ message: 'Logged out successfully' });
     } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Logout failed.' });
     }
});
router.use((req, res, next) => {
    // Log all changes to the audit trail.
    const logDetails = {
        user_id: req.user ? req.user.user_id : null,
        action: `${req.method} ${req.path}`,
        target_type: 'api',
         target_id: null,
         details: JSON.stringify(req.body || req.query)
     };
    pool.query('INSERT INTO audit_logs(log_id, user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)', [uuidv4(), logDetails.user_id, logDetails.action, logDetails.target_type, logDetails.target_id, logDetails.details])
        next();
});
module.exports = router;
