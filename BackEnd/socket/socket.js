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
            userFriendsMap.set(userId, onlineFriendIds);
            socket.join(userId);
            try {
                io.emit('status', { userId });
                io.to(userId).emit('restatus', onlineFriends);
            } catch (error) {
                console.error('Error in joinRoom:', error);
            }

            
        });
       
        socket.on("call-user", (data) => {

            if (!data || !data.to) {
                // Note: In a real app, you would check if the user is online here.
                return console.log("Call user request missing data or recipient.");
            }
            
            io.to(data.to).emit("incoming-call", {
                offer: data.offer,
                from: data.from.userId, // Sender's user ID
                fromName: data.from.userName || 'Unknown User', // Added fromName for better context in incomingCall.js
            });
            console.log(`Call offered: ${socket.id} -> ${data.to}`);
        });
    
        // --- 2. INITIAL CALL HANDSHAKE (Answer) ---
        // LISTENS: The incoming receiver accepts and sends back the Answer.
        // NOTE: The listener is changed from "answer-call" to "answer" to match the event name used in incomingCall.js
        // EMITS: Sends the Answer back to the original caller.
        socket.on("answer", (data) => {
       
            if (!data || !data.to) return console.warn('Answer received but missing recipient.');
            
            io.to(data.to).emit("call-answered", {
                answer: data.answer,
            });
            console.log(`Answer relayed: ${socket.id} -> ${data.to}`);
        });
    
        // --- 3. UNIFIED SIGNALING CHANNEL (ICE Candidates) ---
        // This handler replaces the confusing 'ice-candidate-inComing' and 'ice-candidate-outGoing' handlers.
        // It is used by both the Caller and the Receiver to send ICE candidates to the opposite peer.
        // LISTENS: Both peers use 'send-signal' to transmit candidates.
        // EMITS: 'receive-signal' is sent to the target, containing the sender's ID and the candidate payload.
        socket.on('send-signal', (data) => {
            if (!data || !data.to || data.type !== 'ice-candidate') {
                 return console.warn("Invalid signal data received:", data);
            }
    
            io.to(data.to).emit('receive-signal', {
                // We pass the sender's ID so the receiver can verify it's from the active call partner
                from: socket.id,
                type: data.type, // 'ice-candidate'
                candidate: data.candidate,
            });
            // console.log(`Relayed ICE Candidate: ${socket.id} -> ${data.to}`);
        });
    
        // --- 4. Call Control ---
        socket.on("reject-call", (data) => {
            if (data && data.to) {
                io.to(data.to).emit("call-rejected", { from: socket.id });
            }
            console.log(`Call rejected by ${socket.id}`);
        });
    
        socket.on("cancel-call", (data) => {
            if (data && data.to) {
                io.to(data.to).emit("call-canceled", { from: socket.id });
            }
            console.log(`Call canceled by ${socket.id}`);
        });
        socket.on("end-call", (data) => {
            if (data && data.to) {
                io.to(data.to).emit("call-ended", { from: socket.id });
            }
            console.log(`Call ended by ${socket.id}`);
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
        socket.on('updateMessageStatus', async (data) => {
            const { friend, messageIds } = data;
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
        socket.on('checkUnseenMsg', async (data) => {
            try {
                const { friendId, messageIds } = data;
                // Update messages where status is 'sent'
                const result = await Messages.updateMany(
                    { _id: { $in: messageIds }, status: 'sent' },
                    { $set: { status: 'read' } }
                );
                io.to(friendId).emit('messagesRead', { messageIds });
                console.log(`Updated ${result.modifiedCount} messages to 'read'`);
            } catch (error) {
                console.error('Error updating unseen messages:', error);
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
