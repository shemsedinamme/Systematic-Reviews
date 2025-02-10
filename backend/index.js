const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
});
const port = process.env.PORT || 3306;
const routes = require('./routes');
const swaggerSpec = require('./swaggerConfig');
const socketHandlers = require('./socketHandlers');

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Register routes
Object.values(routes).forEach(route => app.use(route));

// Register Socket.io event handlers
socketHandlers(io);

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
