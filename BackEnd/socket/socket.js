const Messages = require("../Modules/Messages.js");
let onlineFriends = [];
let onlineUsers = new Map();  

module.exports = (io) => {
    io.on("connection", (socket) => {      
        socket.on("joinRoom", (data) => {
            const { userId, friends } = data;
            const _id = userId;
            const socketId = socket.id;
            onlineUsers.set(userId, socket.id);
   
            const onlineFriends = friends.filter(friend => onlineUsers.has(friend._id));
            console.log( 'onlineFriends', onlineFriends, 'friends', friends, )
            socket.join(userId);
            try {
                io.emit('status', { socketId, _id });
                io.to(userId).emit('restatus', onlineFriends);
            } catch (error) {
                console.error('Error in joinRoom:', error);
            }
        });

        socket.on('sendMessage', (data) => {
          
            const { chatId, senderId, receiverId, content,timestamp } = data;
            try {
                io.to(receiverId).emit('recievedMessage', { content, senderId, receiverId, chatId, timestamp });
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
            const recipient = onlineFriends.find(member => member.userId === userId);
            if (recipient) {
                io.to(recipient.userId).emit('friendRequestNotification', { senderId, message });
            } else {
                console.log(`User with ID ${userId} is not currently connected`);
            }
        });

    
        socket.on('emit_notification', (data) => {
            const { recipient } = data;
            console.log(onlineUsers, 'onlineUsers')
            const recipientSocketId = onlineUsers.get(recipient);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('got_a_notification', data);
            } else {
                console.log(`Recipient ${recipient} is not online.`);
            }
        });
        socket.on("disconnect", () => {
            console.log(onlineUsers, 'vegore disconnect')
            onlineFriends = onlineFriends.filter(member => member.socketId !== socket.id);
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    break;
                }
            }
            io.emit('userLeft', onlineFriends);
            console.log(onlineUsers, 'from disconnect')
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err.message);
        });
    });
};
