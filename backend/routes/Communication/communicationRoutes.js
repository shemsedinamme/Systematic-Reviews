const express = require('express');
const { authenticateToken } = require('./authMiddleware');
const { v4: uuidv4 } = require('uuid');
const pool = require('./database');
const OTManager = require('./ot');
const router = express.Router();
const io = require('./index').io; // Import the io object from index.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
require('dotenv').config()

// Map to hold OT managers for each document
const otManagers = new Map();


// Configure Passport Google Strategy
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3306/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, cb) => {
        // Use the profile information to find or create a user in our database
       try{
            // Implement logic to handle google user and get user details. Then create a new user or login if exists
           console.log('google user profile', profile)
         return cb(null, profile);
        }catch (error) {
           console.log('google auth error', error);
             return cb(error, null);
       }
     }
  ));
// Configure Passport Microsoft Strategy
passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: "http://localhost:3306/auth/microsoft/callback",
        scope: ['user.read'],
     },
     async (accessToken, refreshToken, profile, cb) => {
           // Implement logic to handle microsoft user and get user details. Then create a new user or login if exists
        try{
             console.log('microsoft user profile', profile)
          return cb(null, profile);
         }catch (error) {
             console.log('microsoft auth error', error);
             return cb(error, null)
          }
     }
  ));

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Authentication with google
 *     description: This is used to authenticate users using google accounts.
 *     security: []
 *     responses:
 *       302:
 *         description: redirects user to google authentication page.
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
 *                message: 'Google Authentication failed'
 */
router.get('/auth/google',  passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
        res.redirect('/');
    });
/**
 * @swagger
 * /auth/microsoft:
 *   get:
 *     summary: Authentication with microsoft
 *     description: This is used to authenticate users using microsoft accounts.
 *     security: []
 *     responses:
 *       302:
 *         description: redirects user to microsoft authentication page.
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
 *                message: 'Microsoft Authentication failed'
 */
router.get('/auth/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));
router.get('/auth/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/login' }), (req, res) => {
     res.redirect('/');
 });

/**
 * @swagger
 * /collaboration/{document_type}/{document_id}:
 *   post:
 *     summary: Handles real time collaboration for documents
 *     description: Handles collaboration and concurrent editing for different type of documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *        - in: path
 *          name: document_type
 *          required: true
 *          description: Type of document such as protocol, data extraction forms, manuscripts.
 *          schema:
 *            type: string
 *        - in: path
 *          name: document_id
 *          required: true
 *          description: id of the document
 *          schema:
 *            type: string
 *     responses:
 *        200:
 *           description: Collaboration started
 *           content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                      content:
 *                          type: string
 *                          description: content of the document
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
 *                message: 'Failed to initiate collaboration.'
 */
router.post('/collaboration/:document_type/:document_id', authenticateToken, async (req, res) => {
    const { document_type, document_id } = req.params;
    try {
        // Handle document-specific logic, e.g., storing change history, implement OT or CRDT here
        //For now, we will create a document if it does not exist
        let [document] = await pool.query('SELECT * from documents WHERE document_id = ? AND project_id = ?', [document_id, req.user.user_id] )
        if(document.length === 0){
           await pool.query('INSERT INTO documents(document_id, project_id, content) VALUES (?, ?, ?)', [document_id, req.user.user_id, ''])
            document = [{document_id: document_id, content: ''}]
        }
         // Get or create OT manager
        let otManager = otManagers.get(document_id)
           if(!otManager){
                 otManager = new OTManager()
                otManagers.set(document_id, otManager);
           }
         // Handle incoming change and broadcast
        if(req.body && req.body.delta){
            const operation =  otManager.generateOperation(
                req.body.delta.ops[0].insert ? 'insert' : 'delete',
                req.body.delta.ops[0].insert ? req.body.delta.ops[0].insert.length : req.body.delta.ops[0].delete,
               req.body.delta.ops[0].insert ? req.body.delta.ops[0].insert : req.body.delta.ops[0].delete,
            )
              const transformedOperation =  otManager.transformOperation(operation, req.body.delta)
            otManager.applyOperation(transformedOperation);
            io.to(`${document_type}-${document_id}`).emit('document-update', {documentId, documentType, delta: transformedOperation});
        }
          res.status(200).json({ content: otManager.getDocument() });
    } catch (error) {
        console.error('Error initiating collaboration:', error);
        res.status(500).json({ message: 'Failed to initiate collaboration.' });
    }
});
/**
 * @swagger
 * /chat/direct:
 *   post:
 *     summary: Send a direct message
 *     description: Send a direct message to a specific user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *        required: true
 *        content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 receiverId:
 *                   type: string
 *                   description: id of the user to send a message
 *                 message:
 *                   type: string
 *                   description: Message content.
 *             example:
 *                 receiverId: "6b7b6172-d59c-4f12-9e7d-6527d0e210d1"
 *                 message: "Hello there!"
 *     responses:
 *       200:
 *         description: Message sent successfully
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
 *                message: 'Failed to send the message'
 */
router.post('/chat/direct', authenticateToken, async (req, res) => {
    const { receiverId, message } = req.body;
    try {
         const messageId = uuidv4()
        await pool.query('INSERT INTO messages (message_id, sender_id, receiver_id, message_type, message_text) VALUES (?, ?, ?, ?, ?)', [messageId, req.user.user_id, receiverId, 'direct', message ]);
        io.to(receiverId).emit('chat-message', {senderId: req.user.user_id, messageText: message});
        res.status(200).send('Message sent successfully.');
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Failed to send the message' });
    }
});
/**
 * @swagger
 * /chat/group:
 *   post:
 *     summary: Send a message to a group
 *     description: Send a group message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: Id of the conversation group.
 *               message:
 *                 type: string
 *                 description: Message text
 *             example:
 *                groupId: "8a7b6c5d-e4f3-4b2a-8c9d-1e2f3a4b5c6d"
 *                message: "Hello Everyone"
 *     responses:
 *       200:
 *         description: Message send successfully
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
 *                message: 'Failed to send group message'
 */
router.post('/chat/group', authenticateToken, async (req, res) => {
    const { groupId, message } = req.body;
    try {
        // Implement logic to send group message using web socket and storing to database.
         const messageId = uuidv4()
           const [conversation] = await pool.query('SELECT participants from conversations WHERE conversation_id = ?', [groupId])
            if(conversation.length ===0 ) return res.status(404).json({message: 'Conversation group not found.'});
            await pool.query('INSERT INTO messages (message_id, sender_id, message_type, message_text) VALUES (?, ?, ?, ?)', [messageId, req.user.user_id, 'group', message ]);
        const participants = JSON.parse(conversation[0].participants) || [];
        participants.forEach(participant => {
          io.to(participant).emit('chat-message', {senderId: req.user.user_id, messageText: message});
        })
        res.status(200).send('Message sent successfully.');
    } catch (error) {
         console.error('Error sending group message:', error);
        res.status(500).json({ message: 'Failed to send group message' });
    }
});
/**
 * @swagger
 * /files:
 *   post:
 *     summary: Upload a new file.
 *     description: Upload a new file to the system with associated metadata.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *        required: true
 *        content:
 *            multipart/form-data:
 *              schema:
 *                type: object
 *                properties:
 *                  file:
 *                    type: string
 *                    format: binary
 *                    description: File to be uploaded
 *     responses:
 *       201:
 *         description: File uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    file_id:
 *                       type: string
 *                       description: The unique identifier of the uploaded file.
 *                    file_name:
 *                      type: string
 *                      description: The name of the file
 *                   file_path:
 *                      type: string
 *                      description: The path where file is stored
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
 *                message: 'Failed to upload file.'
 */
router.post('/files', authenticateToken, async (req, res) => {
    try {
       if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }
         const file = req.files.file; // the name of the field in HTML form must be file.
        const filePath = `uploads/${uuidv4()}-${file.name}`;
           //TODO -  Implement logic to store files in database or cloud storage
        await file.mv(filePath);
         const fileId = uuidv4()
           await pool.query('INSERT INTO files(file_id, project_id, file_path, file_name, owner_id) VALUES (?, ?, ?, ?, ?)', [fileId, req.user.user_id, filePath, file.name, req.user.user_id]);
          res.status(201).json({
              file_id: fileId,
              file_name: file.name,
              file_path: filePath
        });
    } catch (error) {
         console.error('Error uploading file:', error);
       res.status(500).json({ message: 'Failed to upload file.' });
    }
});
/**
 * @swagger
 * /files/{file_id}:
 *   get:
 *     summary: Get a specific file by id
 *     description: Gets a file using file id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: file_id
 *         required: true
 *         description: ID of the file to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File details fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    file_id:
 *                      type: string
 *                      description: The unique identifier of the file.
 *                    file_name:
 *                      type: string
 *                      description: The name of the file
 *                   file_path:
 *                      type: string
 *                      description: The path where file is stored
 *       404:
 *         description: File not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'File not found.'
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
 *                message: 'Failed to fetch the file details.'
 */
router.get('/files/:file_id', authenticateToken, async (req, res) => {
    const { file_id } = req.params;
    try {
        //TODO -  Implement logic to fetch file details from database or cloud storage
         const [file] = await pool.query('SELECT file_id, file_name, file_path FROM files WHERE file_id = ?', [file_id]);
        if(file.length === 0 ) return res.status(404).json({message: 'File not found.'});
        res.status(200).json(file[0]);
    } catch (error) {
        console.error('Error fetching file details:', error);
        res.status(500).json({ message: 'Failed to fetch the file details.' });
    }
});
/**
 * @swagger
 * /files/{file_id}/versions:
 *   get:
 *     summary: List all versions of a file
 *     description: List all the previous versions of the file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: file_id
 *         required: true
 *         description: ID of the file to get the versions.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: versions fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
  *                  type: object
 *                    properties:
 *                         version_id:
 *                           type: string
 *                           description: unique id for this version of the file.
 *                        version_date:
 *                           type: string
 *                           description: timestamp of this version
 *       404:
 *         description: File not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'File not found.'
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
 *                message: 'Failed to fetch the file versions.'
 */
router.get('/files/:file_id/versions', authenticateToken, async (req, res) => {
    const { file_id } = req.params;
    try {
      //TODO - Implement logic to fetch different versions of a file from DB or cloud storage using file Id.
        res.status(200).json([{version_id: uuidv4(), version_date: Date.now()}])
    } catch (error) {
        console.error('Error fetching file versions:', error);
        res.status(500).json({ message: 'Failed to fetch the file versions.' });
    }
});
/**
 * @swagger
 * /tasks/{task_id}/assign:
 *   post:
 *     summary: Assigns a user to a task
 *     description: Assigns a task to a user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         description: ID of the task to assign the user.
 *         schema:
 *           type: string
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: The id of the user to assign the task.
 *               due_date:
 *                 type: string
 *                 description: The due date of the task.
 *             example:
 *                 user_id: "6b7b6172-d59c-4f12-9e7d-6527d0e210d1"
 *                 due_date: "2024-12-20"
 *     responses:
 *       200:
 *         description: Task assigned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    task_id:
 *                      type: string
 *                      description: The unique identifier for workflow task
 *                    assigned_user_id:
 *                       type: string
 *                       description: The user assigned to the task.
 *                    due_date:
 *                        type: string
 *                        description: due date of the task.
 *       404:
 *         description: Task not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Task not found'
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
 *                message: 'Failed to assign the task.'
 */
router.post('/tasks/:task_id/assign', authenticateToken, async (req, res) => {
    const { task_id } = req.params;
    const { user_id, due_date } = req.body;
    try {
        const [updatedTask] = await pool.query(
            'UPDATE tasks SET assigned_user_id = ?, due_date = ? WHERE task_id = ?',
            [user_id, due_date, task_id]
        );
          if(updatedTask.affectedRows === 0) return res.status(404).json({message: 'Task not found'})
          const [task] = await pool.query('SELECT task_id, task_name, assigned_user_id, due_date FROM tasks WHERE task_id = ?', [task_id])
        res.status(200).json(task[0]);
    } catch (error) {
        console.error('Error assigning task to user:', error);
        res.status(500).json({ message: 'Failed to assign the task.' });
    }
});
/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications for a user
 *     description: Gets all the notifications for a specific user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
  *                  type: object
 *                    properties:
 *                       notification_id:
 *                           type: string
 *                           description: id of the notification.
 *                      message:
 *                        type: string
 *                        description: content of the message.
 *                     time:
 *                        type: string
 *                        description: time of the notification
  *                    status:
 *                        type: string
 *                        description: the status of the notification
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
 *                message: 'Failed to fetch notifications'
 */
router.get('/notifications', authenticateToken, async (req, res) => {
   try {
       const [notifications] = await pool.query('SELECT notification_id, message, time, status FROM notifications WHERE user_id = ?', [req.user.user_id]);
      res.status(200).json(notifications);
    } catch (error) {
       console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});
/**
 * @swagger
 * /notifications/{notification_id}:
 *   put:
 *     summary: Mark a notification as read
 *     description: Updates notification status to read.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notification_id
 *         required: true
 *         description: ID of the notification to mark as read
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification updated to read successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
  *                 notification_id:
 *                       type: string
 *                       description: id of the notification
  *                 status:
 *                       type: string
 *                       description: status of notification
 *       404:
 *          description: Notification not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Notification not found.'
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
 *                message: 'Failed to update notification.'
 */
router.put('/notifications/:notification_id', authenticateToken, async (req, res) => {
    const { notification_id } = req.params;
    try {
        const [updatedNotification] = await pool.query('UPDATE notifications SET status = ? WHERE notification_id = ?', ['read', notification_id]);
          if(updatedNotification.affectedRows === 0) return res.status(404).json({message: 'Notification not found.'});
           const [notification] = await pool.query('SELECT notification_id, status FROM notifications WHERE notification_id = ?', [notification_id]);
            res.status(200).json(notification[0]);
     } catch (error) {
        console.error('Error updating notification status:', error);
        res.status(500).json({ message: 'Failed to update notification.' });
    }
});
/**
 * @swagger
 *  /documents/{document_id}/versions:
 *   get:
 *     summary: Get version history for a document
 *     description: Retrieves version history for a document based on document ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         description: ID of the document to get version history.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document version history retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                    type: object
 *                    properties:
 *                       version_id:
 *                           type: string
 *                           description: unique identifier of document version.
 *                       version_date:
 *                           type: string
 *                           description: timestamp when document version was created.
 *       404:
 *          description: Document not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Document not found.'
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
 *                message: 'Failed to fetch document version history.'
 */
router.get('/documents/:document_id/versions', authenticateToken, async (req, res) => {
  const { document_id } = req.params;
  try {
      //TODO - implement logic to get version history for the document from document_versions table based on document id
     const [versions] = await pool.query(
         'SELECT version_id, version_date FROM document_versions WHERE document_id = ?',
          [document_id]
        );
       if(versions.length === 0) return res.status(404).json({message: 'Document not found.'});
     res.status(200).json(versions);
  } catch (error) {
        console.error('Error fetching document version history:', error);
        res.status(500).json({ message: 'Failed to fetch document version history.' });
    }
});
/**
 * @swagger
 * /meetings:
 *   post:
 *     summary: Create a new meeting
 *     description: Creates a new meeting for a project.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *        required: true
 *        content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meeting_title:
 *                   type: string
 *                   description: title of the meeting.
 *                 start_time:
 *                    type: string
 *                    format: date-time
 *                    description: meeting start time
 *                 end_time:
 *                    type: string
 *                    format: date-time
 *                    description: meeting end time
 *                 attendees:
 *                     type: array
 *                     items:
 *                        type: string
 *                     description: List of user ids attending the meeting.
 *             example:
 *                  meeting_title: "Weekly Review Meeting"
 *                  start_time: "2024-03-10T10:00:00Z"
 *                  end_time:  "2024-03-10T11:00:00Z"
 *                  attendees: ["6b7b6172-d59c-4f12-9e7d-6527d0e210d1", "7a8b7c9d-1e2f-4a5b-9c7d-8e9f1a2b3c4d"]
 *     responses:
 *       201:
 *         description: New meeting created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meeting_id:
 *                   type: string
 *                   description: The unique identifier of the meeting.
 *                 organizer_id:
 *                    type: string
 *                    description: Id of the meeting organizer
  *                meeting_title:
 *                     type: string
 *                     description: title of the meeting.
 *                start_time:
 *                   type: string
 *                   format: date-time
 *                   description: meeting start time
 *                end_time:
 *                   type: string
 *                   format: date-time
 *                   description: meeting end time
 *                attendees:
 *                    type: array
 *                    items:
 *                      type: string
 *                    description: List of user ids attending the meeting.
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Meeting title, start and end time are required'
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
 *                message: 'Failed to create a new meeting.'
 */
router.post('/meetings', authenticateToken, async (req, res) => {
    const { meeting_title, start_time, end_time, attendees } = req.body;
      if(!meeting_title || !start_time || !end_time){
          return res.status(400).json({message: 'Meeting title, start and end time are required'})
      }
    try {
          const meetingId = uuidv4()
         await pool.query(
             'INSERT INTO meetings (meeting_id, organizer_id, meeting_title, start_time, end_time, attendees) VALUES (?, ?, ?, ?, ?, ?)',
             [meetingId, req.user.user_id, meeting_title, start_time, end_time, JSON.stringify(attendees) || '[]']
        );
       const meeting = {
           meeting_id: meetingId,
           organizer_id: req.user.user_id,
           meeting_title: meeting_title,
           start_time: start_time,
            end_time: end_time,
          attendees: attendees
       }
       res.status(201).json(meeting);
    } catch (error) {
       console.error('Error creating a new meeting:', error);
        res.status(500).json({ message: 'Failed to create a new meeting.' });
    }
});

/**
 * @swagger
 * /meetings:
 *   get:
 *     summary: Get all the meetings for a user.
 *     description: gets all the meetings a user has been invited to as well as the meetings the user organized.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All meetings are fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
  *                    meeting_id:
 *                       type: string
 *                       description: The unique identifier of the meeting.
 *                    organizer_id:
 *                       type: string
 *                       description: The id of the user organizing the meeting.
  *                  meeting_title:
 *                       type: string
 *                       description: The title of the meeting
 *                    start_time:
 *                       type: string
 *                       format: date-time
 *                       description: start time of the meeting
 *                     end_time:
 *                        type: string
 *                        format: date-time
 *                        description: end time of the meeting.
 *                    attendees:
 *                       type: array
 *                       description: List of the user ids of the attendees of the meeting.
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
 *                message: 'Failed to retrieve meetings'
 */
router.get('/meetings', authenticateToken, async (req, res) => {
    try {
         //TODO - Implement logic to fetch all the meeting for a user.
          const [meetings] = await pool.query(
              `SELECT meeting_id, organizer_id, meeting_title, start_time, end_time, attendees FROM meetings 
                  WHERE organizer_id = ? OR JSON_CONTAINS(attendees, ?)
                `,[req.user.user_id, JSON.stringify(req.user.user_id)]);
        res.status(200).json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
      res.status(500).json({ message: 'Failed to retrieve meetings' });
    }
});
/**
 * @swagger
 * /meetings/{meeting_id}:
 *   get:
 *     summary: Get a specific meeting by id.
 *     description: Retrieves a meeting details by meeting id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meeting_id
 *         required: true
 *         description: ID of the meeting to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meeting details fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    meeting_id:
 *                       type: string
 *                       description: The unique identifier of the meeting.
 *                    organizer_id:
 *                       type: string
 *                       description: Id of the meeting organizer
  *                  meeting_title:
 *                       type: string
 *                       description: The title of the meeting
 *                    start_time:
 *                       type: string
 *                       format: date-time
 *                       description: start time of the meeting
 *                    end_time:
 *                       type: string
 *                       format: date-time
 *                       description: end time of the meeting
 *                    attendees:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of user ids attending the meeting.
 *       404:
 *         description: Meeting not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Meeting not found.'
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
 *                message: 'Failed to fetch the meeting details'
 */
router.get('/meetings/:meeting_id', authenticateToken, async (req, res) => {
    const { meeting_id } = req.params;
    try {
       const [meeting] = await pool.query('SELECT meeting_id, organizer_id, meeting_title, start_time, end_time, attendees FROM meetings WHERE meeting_id = ?', [meeting_id]);
        if(meeting.length === 0) return res.status(404).json({message: 'Meeting not found.'});
        res.status(200).json(meeting[0]);
    } catch (error) {
        console.error('Error fetching meeting details:', error);
        res.status(500).json({ message: 'Failed to fetch the meeting details' });
    }
});

/**
 * @swagger
 * /meetings/{meeting_id}:
 *   put:
 *     summary: Update a specific meeting based on its ID.
 *     description: Updates an existing meeting details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meeting_id
 *         required: true
 *         description: ID of the meeting to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meeting_title:
 *                 type: string
 *                 description: title of the meeting.
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: meeting start time
 *               end_time:
 *                  type: string
 *                  format: date-time
 *                  description: meeting end time
 *               attendees:
 *                 type: array
 *                 items:
 *                    type: string
 *                 description: List of the user ids of the attendees of the meeting.
 *             example:
 *                meeting_title: "New weekly project meeting"
 *                start_time: "2024-03-10T10:00:00Z"
 *                end_time: "2024-03-10T11:00:00Z"
 *                attendees: ["6b7b6172-d59c-4f12-9e7d-6527d0e210d1", "7a8b7c9d-1e2f-4a5b-9c7d-8e9f1a2b3c4d"]
 *     responses:
 *       200:
 *         description: Meeting updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
  *                  meeting_id:
 *                       type: string
 *                       description: The unique identifier of the meeting.
 *                    organizer_id:
 *                       type: string
 *                       description: The id of the user organizing the meeting.
  *                  meeting_title:
 *                       type: string
 *                       description: The title of the meeting.
 *                    start_time:
 *                       type: string
 *                       format: date-time
 *                       description: The meeting start time
 *                    end_time:
 *                       type: string
 *                       format: date-time
 *                       description: The meeting end time.
 *                    attendees:
 *                       type: array
 *                       items:
 *                           type: string
 *                       description: List of the user ids of the attendees for this meeting.
 *       404:
 *         description: Meeting not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Meeting not found.'
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
 *                message: 'Failed to update the meeting details.'
 */
router.put('/meetings/:meeting_id', authenticateToken, async (req, res) => {
    const { meeting_id } = req.params;
    const { meeting_title, start_time, end_time, attendees } = req.body;
      try {
          const [updatedMeeting] = await pool.query('UPDATE meetings SET meeting_title = ?, start_time = ?, end_time = ?, attendees = ? WHERE meeting_id = ?', [meeting_title, start_time, end_time, JSON.stringify(attendees), meeting_id]);
        if (updatedMeeting.affectedRows === 0) return res.status(404).json({ message: 'Meeting not found.' });
           const [meeting] = await pool.query('SELECT meeting_id, organizer_id, meeting_title, start_time, end_time, attendees FROM meetings WHERE meeting_id = ?', [meeting_id]);
            res.status(200).json(meeting[0]);
       } catch (error) {
        console.error('Error updating meeting:', error);
        res.status(500).json({ message: 'Failed to update the meeting details.' });
    }
});

/**
 * @swagger
 * /meetings/{meeting_id}:
 *   delete:
 *     summary: Delete a specific meeting using meeting ID.
 *     description: Delete a specific meeting using its ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meeting_id
 *         required: true
 *         description: ID of the meeting to be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meeting deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   message:
 *                     type: string
 *                     description: Message from system about deletion.
 *       404:
 *          description: Meeting not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Meeting not found.'
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
 *                message: 'Failed to delete the meeting.'
 */
router.delete('/meetings/:meeting_id', authenticateToken, async (req, res) => {
  const { meeting_id } = req.params;
  try {
    const [deletedMeeting] = await pool.query('DELETE FROM meetings WHERE meeting_id = ?', [meeting_id]);
        if (deletedMeeting.affectedRows === 0) return res.status(404).json({message: 'Meeting not found.'});
      res.status(200).json({ message: 'Meeting deleted successfully.' });
  } catch (error) {
      console.error('Error deleting meeting:', error);
      res.status(500).json({ message: 'Failed to delete the meeting.' });
  }
});
/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Gets audit logs based on search parameters.
 *     security:
 *       - bearerAuth: []
  *     parameters:
 *       - in: query
 *         name: user_id
 *         required: false
 *         description: ID of the user to retrieve the logs for.
 *         schema:
 *           type: string
 *       - in: query
 *         name: from_date
 *         required: false
 *         description: From date for the audit logs.
 *         schema:
 *            type: string
 *            format: date-time
 *       - in: query
 *         name: to_date
 *         required: false
 *         description: To date for the audit logs.
 *         schema:
 *            type: string
 *            format: date-time
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                    type: object
 *                    properties:
 *                       log_id:
 *                         type: string
 *                         description: The unique identifier for the audit log.
 *                       user_id:
 *                         type: string
 *                         description: user who did the action that was logged.
 *                       action:
 *                         type: string
 *                         description: action that is being tracked
 *                       target_type:
 *                         type: string
 *                         description: target type for audit log
 *                       target_id:
 *                         type: string
 *                         description: the id of the target.
 *                       time:
 *                         type: string
 *                         description: timestamp of the action logged.
 *                       details:
 *                           type: string
 *                           description: any other details.
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
 *                message: 'Failed to fetch audit logs'
 */
router.get('/audit-logs', authenticateToken, async (req, res) => {
    const { user_id, from_date, to_date } = req.query;
    try {
       let query = 'SELECT log_id, user_id, action, target_type, target_id, timestamp, details FROM audit_logs WHERE 1=1';
         const queryParams = [];
        if (user_id) {
             query += ' AND user_id = ?';
             queryParams.push(user_id);
         }
        if (from_date) {
            query += ' AND timestamp >= ?';
             queryParams.push(from_date);
        }
         if (to_date) {
            query += ' AND timestamp <= ?';
             queryParams.push(to_date);
        }
       const [auditLogs] = await pool.query(query, queryParams);
          res.status(200).json(auditLogs);
     } catch (error) {
        console.error('Error fetching audit logs:', error);
       res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
});

module.exports = router;