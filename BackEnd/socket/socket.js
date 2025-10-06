const Messages = require("../Modules/Messages.js");
let onlineFriends = [];
let onlineUsers = new Map();
let userFriendsMap = new Map();
module.exports = (io) => {
    io.on("connection", (socket) => {
        socket.on("joinRoom", (data) => {
            const { userId, friends } = data;
            onlineUsers.set(userId, socket.id);
            const onlineFriends = friends?.filter(friend => onlineUsers.has(friend._id));
            const onlineFriendIds = onlineFriends?.map(friend => friend._id);
            // Save online friends for this user
            userFriendsMap.set(userId, onlineFriendIds);
            socket.join(userId);
            try {
                io.emit('status', { userId });
               
                io.to(userId).emit('restatus', onlineFriends);
            } catch (error) {
                console.error('Error in joinRoom:', error);
            }
        });
        socket.on("offer", (offer, member) => {
           
            socket.to(member._id).emit("offer", {member,offer});
        });
        socket.on("answer", (answer, member) => {
            socket.to(member._id).emit("answer", {member,answer});
        });

        socket.on("candidate", (candidate, member) => {
            socket.to(member._id).emit("candidate", {member,candidate});
        });
        socket.on('sendMessage', (data) => {
            const { chatId, senderId, receiverId, content, attachment, timestamp } = data;
            try {
                io.to(receiverId).emit('recievedMessage', { content, attachment, senderId: { _id: senderId }, receiverId, chatId, timestamp });
            } catch (err) {
                console.error('Error sending message:', err.message);
            }
        })
        socket.on('groupMessage', (data) => {
            const { senderId, message } = data;
            const friends = userFriendsMap.get(senderId) || [];
            const socketIds = friends.map(id => onlineUsers.get(id)).filter(Boolean);

            io.to(socketIds).emit("fetchMessage", data);
        });

        socket.on('updateMessageStatus',async(data)=>{
        const {friend, messageIds} = data; 
        console.log(friend, messageIds, 'socket mst')
        })
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
                )
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
            const recipientSocketId = onlineUsers.get(recipient);
           
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('got_a_notification', data);
            } else {
                console.log(`Recipient ${recipient} is not online.`);
            }
        });
        socket.on("disconnect", () => {
            let disconnectedUserId = null;
            // Identify and remove user from maps
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userId;
                    onlineUsers.delete(userId);
                    userFriendsMap.delete(userId);
                    break;
                }
            }
            // Notify each online friend
            if (disconnectedUserId) {
                for (const [userId, friends] of userFriendsMap.entries()) {
                    if (friends.includes(disconnectedUserId)) {
                        const friendSocketId = onlineUsers.get(userId);
                        if (friendSocketId) {
                            io.to(friendSocketId).emit('userLeft', { userId: disconnectedUserId });
                        }
                    }
                }
            }
        });
        socket.on('error', (err) => {
            console.error('Socket error:', err.message);
        });
    });
};
