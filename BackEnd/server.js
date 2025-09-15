const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require("socket.io");
const app = require('./app');
app.use(express.json())
// Load environment variables
dotenv.config();


// Setup Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});
// Import and initialize Socket.IO logic
require("./socket/socket")(io);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
})
// Start server
const PORT = process.env.PORT || 5500;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
server.on('error', (err) => {
    console.error('HTTP server error:', err.message);
});
