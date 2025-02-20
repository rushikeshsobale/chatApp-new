
const express = require('express');
const Messages = require('./Modules/Messages.js');
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
    res.setHeader('Access-Control-Allow-Origin', `${process.env.FRONTEND_URL}`);
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
        const { userId } = data;
        const socketId = socket.id;
        activeMembers.push({ socketId, userId });
        socket.join(userId);
        try {
            io.emit('status', { socketId, userId });
            io.to(userId).emit('restatus', activeMembers);

        } catch (error) {
            console.log('Something went wrong:', error);
        }
    });
    socket.on('sendMessage', (data) => {
        console.log(data,'data')
        const { chatId, senderId, receiverId, content } = data;
        try {
            io.to(receiverId).emit('recievedMessage', { content: content, senderId: senderId, receiverId: receiverId, chatId: chatId });
        } catch (err) {
            console.error('Error sending message:', err.message);
        }
    });
    socket.on('setDoubleCheck', async (data) => {
        const { friendId, chatId, message } = data;
        try {
            // Fetch latest messages for the chat
            const messages = await Messages.find({ chatId })
                .sort({ createdAt: -1 }) // Get latest messages first
                .skip((1 - 1) * 15) // Pagination
                .limit(15);
    
            const messageIds = messages.map((msg) => msg._id);
    
            // Update messages to mark them as "read"
            await Messages.updateMany(
                { _id: { $in: messageIds } },
                { $set: { status: "read" } }
            );
    
            // **Modify the message before emitting**
            const updatedMessage = {
                ...message,
                status: "read", // Set status to read
                timestamp: new Date().toISOString() // Add timestamp
            };
    
            // Emit updated message to the friend
            io.to(friendId).emit('setDoubleCheckRecieved', updatedMessage);
    
        } catch (err) {
            console.error("Error updating message status:", err);
        }
    });
    

    socket.on("typing", ({ userId, myId }) => {
        if (userId) {
            io.to(userId).emit("typing", { myId });
        }
    });

    socket.on("stopped_typing", ({ userId }) => {

        if (userId) {
            io.to(userId).emit("stopped_typing");
        }
    });

    socket.on('recievedMsg', (data) => {
        const { id, id2 } = data;
        try {
            io.to(id).emit('setStatus', { messageId: id2, userId: id });
        } catch (err) {
            console.log(err)
        }
    });


    socket.on('raisedRequest', ({ userId, senderId, message }) => {

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
        io.emit('userLeft', activeMembers);
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
