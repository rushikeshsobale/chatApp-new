const http = require('http');
const app = require('./app'); // Import Express app
const socketIo = require("socket.io");

const PORT = process.env.PORT || 5500;
const server = http.createServer(app);

// Setup Socket.IO
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

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('HTTP server error:', err.message);
});
