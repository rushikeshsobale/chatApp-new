const Messages = require("../Modules/Messages.js");
let activeMembers = [];
module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        socket.on("joinRoom", (data) => {
            const { userId } = data;
            const socketId = socket.id;
            activeMembers.push({ socketId, userId });
            socket.join(userId);
            try {
                io.emit('status', { socketId, userId });
                io.to(userId).emit('restatus', activeMembers);
            } catch (error) {
                console.error('Error in joinRoom:', error);
            }
        });

        socket.on('sendMessage', (data) => {
            console.log('Message received:', data);
            const { chatId, senderId, receiverId, content } = data;
            try {
                io.to(receiverId).emit('recievedMessage', { content, senderId, receiverId, chatId });
            } catch (err) {
                console.error('Error sending message:', err.message);
            }
        });

        socket.on('setDoubleCheck', async (data) => {
            const { friendId, chatId, message } = data;
            try {
                const messages = await Messages.find({ chatId })
                    .sort({ createdAt: -1 })
                    .skip((1 - 1) * 15)
                    .limit(15);

                const messageIds = messages.map((msg) => msg._id);

                await Messages.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { status: "read" } }
                );

                const updatedMessage = {
                    ...message,
                    status: "read",
                    timestamp: new Date().toISOString()
                };

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
                console.error('Error in recievedMsg:', err);
            }
        });

        socket.on('raisedRequest', ({ userId, senderId, message }) => {
            const recipient = activeMembers.find(member => member.userId === userId);
            if (recipient) {
                io.to(recipient.userId).emit('friendRequestNotification', { senderId, message });
            } else {
                console.log(`User with ID ${userId} is not currently connected`);
            }
        });

        socket.on("disconnect", () => {
            activeMembers = activeMembers.filter(member => member.socketId !== socket.id);
            io.emit('userLeft', activeMembers);
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err.message);
        });
    });
};
