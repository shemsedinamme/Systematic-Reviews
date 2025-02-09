const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const http = require('http')
const {Server} = require('socket.io')
require('dotenv').config()
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: '*',
    }
  });
const port = process.env.PORT || 3306;
const userRoutes = require('./routes/user/userRoutes');
const projectRoutes = require('./routes/project/projectRoutes');
const protocolRoutes = require('./routes/protocol/protocolRoutes');
const searchRoutes = require('./routes/search/searchRoutes');
const screeningRoutes = require('./routes/screening/screeningRoutes');
const qualityAssessmentRoutes = require('./routes/qualityAssessment/qualityAssessmentRoutes');
const dataExtractionRoutes = require('./routes/dataExtraction/dataExtractionRoutes');
const dataSynthesisRoutes = require('./routes/dataSynthesis/dataSynthesisRoutes');
const reportRoutes = require('./routes/Report/ReportRoutes');
const mlRoutes = require('./routes/ml/mlRoutes');
const communicationRoutes = require('./routes/communication/communicationRoutes');
const adminUserRoutes = require('./routes/adminUser/adminUserRoutes');
const adminSettingRoutes = require('./routes/setting/adminSettingRoutes');
const swaggerSpec = require('./swaggerConfig');

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use(userRoutes)
app.use(projectRoutes);
app.use(protocolRoutes);
app.use(searchRoutes);
app.use(screeningRoutes);
app.use(qualityAssessmentRoutes);
app.use(dataExtractionRoutes);
app.use(dataSynthesisRoutes);
app.use(reportRoutes);
app.use(mlRoutes);
app.use(communicationRoutes);
app.use(adminUserRoutes);
app.use(adminSettingRoutes);

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinDocument', (documentType, documentId) => {
        socket.join(`${documentType}-${documentId}`);
    });

    socket.on('documentChange', (data) => {
        socket.to(`${data.documentType}-${data.documentId}`).emit('updateDocument', data);
    });

     socket.on('sendMessage', (msg) => {
       io.to(msg.receiverId).emit('receiveMessage', msg);
     });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});