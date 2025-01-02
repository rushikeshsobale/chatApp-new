
const express = require('express');
require('dotenv').config();
const app = express();
const cors = require("cors");
const corsOptions = {
    origin: `${process.env.FRONTEND_URL}`,
    credentials: true,
};
app.use(cors(corsOptions));
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.json());
require("./Mongo/Conn.js")
app.options('/socket.io/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin',  `${process.env.FRONTEND_URL}`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

const router = require('./route/router');
app.use(router);
const http = require('http').createServer(app);
const io = require("socket.io")(http, {
    cors: {
        origin: `${process.env.FRONTEND_URL}`,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});
let activeMembers = []
io.on("connection", (socket) => {
    socket.on("joinRoom", (data) => {
        const {userId} = data;
        const socketId = socket.id;
        activeMembers.push({ socketId, userId });
        socket.join(userId);
        try {
            io.emit('status', {socketId, userId}); 
            io.to(userId).emit('restatus', activeMembers);
           
        } catch (error) {
            console.log('Something went wrong:', error);
        }
    });
    socket.on('sendMessage', (data) => {
        const { message, userId, myId, sender, timestamp } = data;
     
        try {
            io.to(userId).emit('message', { text: message, senderId: myId, senderName: sender, timestamp: timestamp });
        } catch (err) {
            console.error('Error sending message:', err.message);
        }
    });
    socket.on('recievedMsg', (data) => {
        const { id, id2 } = data;
        try {
            io.to(id).emit('setStatus', { messageId: id2, userId:id });
        } catch (err) {
            console.log(err)
        }
    });
    socket.on('raisedRequest', ({ userId, senderId, message}) => {
        console.log({  message }, 'from raisedRequest');
        const recipient = activeMembers.find(member => member.userId === userId);
        if (recipient) {
          const recipientSocketId = recipient.userId;
        
          io.to(recipientSocketId).emit('friendRequestNotification', { senderId, message });
        } else {
          console.log(`User with ID ${userId} is not currently connected`);
        }
      });


      
    socket.on("disconnect", () => {
        const socketId = socket.id;
        activeMembers = activeMembers.filter(member => member.socketId !== socketId);
        io.emit('userLeft', activeMembers );
    });
    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
})
http.on('error', (err) => {
    console.error('HTTP server error:', err.message);
});
const port = 5500;
http.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
