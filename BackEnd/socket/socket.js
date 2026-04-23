const Messages = require("../Modules/Messages.js");
let onlineFriends = [];
let onlineUsers = new Map();
let userFriendsMap = new Map();
module.exports = (io) => {
    io.on("connection", (socket) => {
        socket.on("joinRoom", (data) => {
            const {userId, friends} = data;
            onlineUsers.set(userId, socket.id);
            socket.join(userId);
            try {
                io.emit('status', { userId });
                io.to(userId).emit('restatus', Array.from(onlineUsers.keys()));
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
            // console.log(`Relaket.on("cancel-call", (data) => {
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

            const {receiverId} = data;
            try {
                io.to(receiverId).emit('recievedMessage', data);
                io.to(receiverId).emit('checkit')
            } catch (err) {
                console.error('Error sending message:', err.message);
            }
        })

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
            console.log(data, 'check  unseen')
            try {
                const { friendId, messageIds } = data;
                // Update messages where status is 'sent'
                const result = await Messages.updateMany(
                    { _id: { $in: messageIds }, status: 'sent' },
                    { $set: { status: 'read' } }
                );
                io.to(friendId).emit('messagesRead', { messageIds });
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

    // 1. If a recipient is specified, try to send it privately
    if (recipient) {
        const recipientSocketId = onlineUsers.get(recipient);
        
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('got_a_notification', data);
        } else {
            console.log(`Recipient ${recipient} is not online. Notification not sent.`);
        }
    } 
    // 2. If no recipient is provided in the data, broadcast to everyone
    else {
        io.emit('got_a_notification', data);
        console.log("No recipient specified. Broadcasting to all users.");
    }
});
        socket.on("disconnect", () => {
            const userId = socket.handshake.query.id;
            if (userId) {
                onlineUsers.delete(userId);
                socket.broadcast.emit('userLeft', { userId });
            }
        });
        socket.on('error', (err) => {
            console.error('Socket error:', err.message);
        });
        socket.on("joinGroup", (groupId) => {
            console.log(`Joining group: ${groupId}`);
            socket.join(groupId);
        });

        socket.on("leaveGroup", (groupId) => {
            socket.leave(groupId);
        });

        socket.on("sendGroupMessage", (message) => {
            const groupId = message.conversationId;
            socket.to(groupId).emit("receiveGroupMessage", message);
        });
    });
};
