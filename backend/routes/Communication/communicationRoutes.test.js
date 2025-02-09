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
     }else {
        return res.sendStatus(403);
       }
    }
}));

describe('Communication Routes', () => {
    beforeEach(async () => {
      await pool.query('DELETE FROM messages');
      await pool.query('DELETE FROM conversations');
      await pool.query('DELETE FROM files');
      await pool.query('DELETE FROM notifications');
      await pool.query('DELETE FROM meetings');
     });
    afterAll(async () => {
        await pool.end();
    });

    it('should initiate collaboration successfully', async () => {
      const response = await request(app)
          .post('/collaboration/protocol/123')
          .set('Authorization', 'Bearer test-token')
          .expect(200);
        expect(response.text).toEqual('Collaboration started');
    });

 it('should handle errors during collaboration initiation', async () => {
      // Mock the database to simulate an error
        jest.spyOn(pool, 'query').mockImplementationOnce(() => {
           throw new Error('Database Error')
        });
         const response = await request(app)
              .post('/collaboration/protocol/123')
             .set('Authorization', 'Bearer test-token')
              .expect(500);
            expect(response.body).toHaveProperty('message', 'Failed to initiate collaboration.')

       jest.spyOn(pool, 'query').mockRestore();
  });

    it('should send a direct message successfully', async () => {
      const response = await request(app)
        .post('/chat/direct')
          .set('Authorization', 'Bearer test-token')
        .send({ receiverId: 'test-user-id', message: 'Hello there!' })
        .expect(200);
       expect(response.text).toEqual('Message sent successfully.');
   });
    it('should handle error during direct message sending', async () => {
        // Mock the database to simulate an error
        jest.spyOn(pool, 'query').mockImplementationOnce(() => {
            throw new Error('Database Error')
        });
        const response = await request(app)
             .post('/chat/direct')
             .set('Authorization', 'Bearer test-token')
             .send({ receiverId: 'test-user-id', message: 'Hello there!' })
             .expect(500);
        expect(response.body).toHaveProperty('message', 'Failed to send the message')
        jest.spyOn(pool, 'query').mockRestore();
    });

    it('should send a group message successfully', async () => {
       //Create a test group and add a user to it.
        await pool.query('INSERT INTO conversations(conversation_id, participants) VALUES (?, ?)', [ 'test-group',  JSON.stringify(['test-user-id'])]);

        const response = await request(app)
            .post('/chat/group')
            .set('Authorization', 'Bearer test-token')
            .send({ groupId: 'test-group', message: 'Hello Everyone!' })
            .expect(200);
        expect(response.text).toEqual('Message sent successfully.');
    });
 it('should handle error during group message sending', async () => {
       // Mock the database to simulate an error
        jest.spyOn(pool, 'query').mockImplementationOnce(() => {
            throw new Error('Database Error')
         });
         const response = await request(app)
            .post('/chat/group')
            .set('Authorization', 'Bearer test-token')
           .send({ groupId: 'test-group', message: 'Hello Everyone!' })
            .expect(500);
        expect(response.body).toHaveProperty('message', 'Failed to send group message')
        jest.spyOn(pool, 'query').mockRestore();
   });

    it('should upload a file successfully', async () => {
       const response = await request(app)
            .post('/files')
             .set('Authorization', 'Bearer test-token')
             .attach('file', 'package.json')
             .expect(201);
         expect(response.body).toHaveProperty('file_id')
        expect(response.body).toHaveProperty('file_name')
         expect(response.body).toHaveProperty('file_path')
       const [file] = await pool.query('SELECT * from files WHERE file_id = ?', [response.body.file_id])
        expect(file.length).toBe(1);
         expect(file[0]).toHaveProperty('file_id', response.body.file_id);
        expect(file[0]).toHaveProperty('file_name', response.body.file_name);
       expect(file[0]).toHaveProperty('file_path', response.body.file_path);
    });
 it('should return 400 error when no files are uploaded', async () => {
       const response = await request(app)
             .post('/files')
             .set('Authorization', 'Bearer test-token')
             .expect(400);
       expect(response.text).toEqual('No files were uploaded.');
   });
     it('should get a file successfully', async () => {
          const responseUpload =  await request(app)
               .post('/files')
                .set('Authorization', 'Bearer test-token')
                .attach('file', 'package.json')
                .expect(201);
       const response = await request(app)
            .get(`/files/${responseUpload.body.file_id}`)
            .set('Authorization', 'Bearer test-token')
            .expect(200);
        expect(response.body).toHaveProperty('file_id', responseUpload.body.file_id);
        expect(response.body).toHaveProperty('file_name', responseUpload.body.file_name);
      expect(response.body).toHaveProperty('file_path', responseUpload.body.file_path);
    });
  it('should return 404 error when file is not found', async () => {
        const response = await request(app)
            .get('/files/non-existing-file-id')
              .set('Authorization', 'Bearer test-token')
           .expect(404);
      expect(response.body).toHaveProperty('message', 'File not found.');
  });

 it('should fetch file versions successfully', async () => {
      const responseUpload =  await request(app)
              .post('/files')
              .set('Authorization', 'Bearer test-token')
               .attach('file', 'package.json')
                .expect(201);
        const response = await request(app)
           .get(`/files/${responseUpload.body.file_id}/versions`)
             .set('Authorization', 'Bearer test-token')
           .expect(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0]).toHaveProperty('version_id')
          expect(response.body[0]).toHaveProperty('version_date')
    });

 it('should return 404 error when no versions found for file', async () => {
        const response = await request(app)
           .get(`/files/non-existing-file/versions`)
              .set('Authorization', 'Bearer test-token')
            .expect(404);
        expect(response.body).toHaveProperty('message', 'File not found.');
   });
    it('should get notifications', async () => {
        const response = await request(app)
           .get('/notifications')
           .set('Authorization', 'Bearer test-token')
             .expect(200);
        expect(response.body).toBeInstanceOf(Array)

    });
     it('should mark a notification as read', async () => {
          const [newNotification] = await pool.query('INSERT INTO notifications(notification_id, user_id, message) VALUES (?, ?, ?)', [uuidv4(), 'test-user-id', 'test notification'])
          const response = await request(app)
              .put(`/notifications/${newNotification.insertId}`)
               .set('Authorization', 'Bearer test-token')
              .expect(200);
         expect(response.body).toHaveProperty('notification_id', newNotification.insertId);
         expect(response.body).toHaveProperty('status', 'read');
      const [notification] = await pool.query('SELECT status FROM notifications WHERE notification_id = ?', [newNotification.insertId]);
      expect(notification[0]).toHaveProperty('status', 'read');
  });
    it('should return 404 error when the notification to update is not found', async () => {
        const response = await request(app)
            .put(`/notifications/non-existing-notification`)
             .set('Authorization', 'Bearer test-token')
           .expect(404);
        expect(response.body).toHaveProperty('message', 'Notification not found.')
    });
     it('should create a new meeting successfully', async () => {
          const newMeeting = {
            meeting_title: "Weekly meeting",
            start_time: "2024-02-29T10:00:00Z",
             end_time:  "2024-02-29T11:00:00Z",
              attendees: []
          };
        const response = await request(app)
              .post('/meetings')
               .set('Authorization', 'Bearer test-token')
              .send(newMeeting)
              .expect(201);
       expect(response.body).toHaveProperty('meeting_id');
       expect(response.body).toHaveProperty('organizer_id', 'test-user-id');
       expect(response.body).toHaveProperty('meeting_title', newMeeting.meeting_title);
       expect(response.body).toHaveProperty('start_time', newMeeting.start_time);
        expect(response.body).toHaveProperty('end_time', newMeeting.end_time);
       expect(response.body).toHaveProperty('attendees', newMeeting.attendees);
       const [meeting] = await pool.query('SELECT * from meetings WHERE meeting_id = ?', [response.body.meeting_id]);
       expect(meeting.length).toBe(1);
    });
 it('should return 400 error when meeting data is invalid during meeting creation', async () => {
         const response = await request(app)
             .post('/meetings')
              .set('Authorization', 'Bearer test-token')
            .send({})
             .expect(400);
         expect(response.body).toHaveProperty('message', 'Meeting title, start and end time are required')
 });
   it('should retrieve all meetings for a user', async () => {
            const newMeeting = {
                meeting_title: "Weekly meeting",
                start_time: "2024-02-29T10:00:00Z",
                 end_time:  "2024-02-29T11:00:00Z",
                attendees: []
            };
       await request(app)
                .post('/meetings')
                 .set('Authorization', 'Bearer test-token')
                .send(newMeeting)
                .expect(201);

        const response = await request(app)
           .get('/meetings')
             .set('Authorization', 'Bearer test-token')
            .expect(200);
      expect(response.body.length).toBe(1);
   });
     it('should get a specific meeting details', async () => {
         const newMeeting = {
               meeting_title: "Weekly meeting",
                start_time: "2024-02-29T10:00:00Z",
               end_time:  "2024-02-29T11:00:00Z",
               attendees: []
           };
          const createMeeting = await request(app)
             .post('/meetings')
              .set('Authorization', 'Bearer test-token')
              .send(newMeeting)
             .expect(201);
         const response = await request(app)
              .get(`/meetings/${createMeeting.body.meeting_id}`)
              .set('Authorization', 'Bearer test-token')
            .expect(200);
        expect(response.body).toHaveProperty('meeting_id', createMeeting.body.meeting_id);
        expect(response.body).toHaveProperty('meeting_title', newMeeting.meeting_title);
        expect(response.body).toHaveProperty('start_time', newMeeting.start_time);
       expect(response.body).toHaveProperty('end_time', newMeeting.end_time);
        expect(response.body).toHaveProperty('attendees', newMeeting.attendees);
    });
  it('should return 404 error if a specific meeting is not found', async () => {
        const response = await request(app)
            .get('/meetings/non-existing-meeting')
           .set('Authorization', 'Bearer test-token')
             .expect(404);
        expect(response.body).toHaveProperty('message', 'Meeting not found.');
  });
 it('should update the data of an existing meeting', async () => {
            const newMeeting = {
               meeting_title: "Weekly meeting",
                start_time: "2024-02-29T10:00:00Z",
                end_time:  "2024-02-29T11:00:00Z",
              attendees: []
          };
         const createMeeting =  await request(app)
              .post('/meetings')
              .set('Authorization', 'Bearer test-token')
                .send(newMeeting)
               .expect(201);

          const updatedMeeting = {
              meeting_title: 'Updated weekly meeting',
              start_time: "2024-03-10T10:00:00Z",
              end_time:  "2024-03-10T11:00:00Z",
                attendees: ['test-user-id']
          }
          const response = await request(app)
            .put(`/meetings/${createMeeting.body.meeting_id}`)
             .set('Authorization', 'Bearer test-token')
              .send(updatedMeeting)
              .expect(200);
       expect(response.body).toHaveProperty('meeting_id', createMeeting.body.meeting_id);
       expect(response.body).toHaveProperty('meeting_title', updatedMeeting.meeting_title);
       expect(response.body).toHaveProperty('start_time', updatedMeeting.start_time);
      expect(response.body).toHaveProperty('end_time', updatedMeeting.end_time);
      expect(response.body).toHaveProperty('attendees', updatedMeeting.attendees);
  const [meeting] = await pool.query('SELECT * FROM meetings WHERE meeting_id = ?', [createMeeting.body.meeting_id]);
       expect(meeting[0]).toHaveProperty('meeting_title', updatedMeeting.meeting_title);
       expect(meeting[0]).toHaveProperty('start_time', updatedMeeting.start_time);
         expect(meeting[0]).toHaveProperty('end_time', updatedMeeting.end_time);
      expect(meeting[0]).toHaveProperty('attendees', JSON.stringify(updatedMeeting.attendees))
      });
      it('should return 404 error if meeting to be updated not found', async () => {
             const updatedMeeting = {
                meeting_title: 'Updated weekly meeting',
                start_time: "2024-03-10T10:00:00Z",
                end_time:  "2024-03-10T11:00:00Z",
                  attendees: ['test-user-id']
            }
           const response = await request(app)
                .put('/meetings/non-existing-meeting')
                .set('Authorization', 'Bearer test-token')
                 .send(updatedMeeting)
                 .expect(404);
             expect(response.body).toHaveProperty('message', 'Meeting not found.');
       });
        it('should delete a specific meeting', async () => {
           const newMeeting = {
                meeting_title: "Weekly meeting",
                start_time: "2024-02-29T10:00:00Z",
                 end_time:  "2024-02-29T11:00:00Z",
                attendees: []
           };
        const createMeeting = await request(app)
           .post('/meetings')
           .set('Authorization', 'Bearer test-token')
            .send(newMeeting)
            .expect(201);
         const response = await request(app)
             .delete(`/meetings/${createMeeting.body.meeting_id}`)
           .set('Authorization', 'Bearer test-token')
           .expect(200);
        expect(response.body).toHaveProperty('message', 'Meeting deleted successfully.');
     const [meeting] = await pool.query('SELECT * from meetings WHERE meeting_id = ?', [createMeeting.body.meeting_id]);
     expect(meeting.length).toBe(0);
     });
 it('should return 404 error if trying to delete a non existing meeting', async () => {
      const response = await request(app)
            .delete('/meetings/non-existing-meeting')
              .set('Authorization', 'Bearer test-token')
            .expect(404);
        expect(response.body).toHaveProperty('message', 'Meeting not found.');
   });
    it('should retrieve audit logs', async () => {
         const response = await request(app)
              .get('/audit-logs')
               .set('Authorization', 'Bearer test-token')
           .expect(200);
         expect(response.body).toBeInstanceOf(Array);
    });
    it('should return 302 status code when authenticating with google', async () => {
          const response = await request(app)
              .get('/auth/google')
              .expect(302);
     });
    it('should return 302 status code when authenticating with microsoft', async () => {
           const response = await request(app)
              .get('/auth/microsoft')
              .expect(302);
      });

});