// socketHandlers.js
module.exports = (io) => {
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
};

