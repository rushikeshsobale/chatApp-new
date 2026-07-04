const Message = require("../Modules/Messages");
const Conversation = require("../Modules/conversations");
const { notify } = require("../utils/notify");
// userId -> Set<socketId>. A user can have more than one tab/device
// connected at once, so presence is only "offline" once every socket for
// that user has disconnected — not just the first one to close.
const onlineUsers = new Map();
// callerId -> in-progress call bookkeeping. Must be module-level (not
// re-created per connection) since the caller and callee are always two
// different socket connections and both need to see the same entry.
const activeCalls = new Map();

module.exports = (io) => {
    io.on("connection", (socket) => {

        socket.on("user:init", (userId) => {
            if (!userId) return;

            socket.userId = userId;

            const wasOffline = !onlineUsers.has(userId);
            if (wasOffline) onlineUsers.set(userId, new Set());
            onlineUsers.get(userId).add(socket.id);

            socket.join(userId);
            socket.emit(
                "online_users",
                Array.from(onlineUsers.keys()).map(id => ({
                    userId: id,
                    status: "online"
                }))
            );
            // Only announce "online" the first time this user connects —
            // a second tab/device shouldn't re-broadcast presence.
            if (wasOffline) {
                socket.broadcast.emit("user:status_changed", {
                    userId,
                    status: "online",
                });
            }
        });


        // socket.on("user:get_status", (targetUserId, callback) => {
        //     const isOnline = onlineUsers.has(targetUserId);

        //     if (callback) {
        //         callback({
        //             status: isOnline ? "online" : "offline",
        //         });
        //     }
        // });

        // ==================================================
        // TYPING INDICATORS
        // ==================================================

        socket.on("message:typing", ({ receiverId }) => {
            if (!receiverId) return;

            io.to(receiverId).emit("message:typing_received", {
                senderId: socket.userId,
            });
        });

        socket.on("message:typing_stop", ({ receiverId }) => {
            if (!receiverId) return;

            io.to(receiverId).emit("message:typing_stop_received", {
                senderId: socket.userId,
            });
        });

        // ==================================================
        // MESSAGE DELIVERY
        // ==================================================

        socket.on(
            "message:send",
            async ({ receiverId, message }) => {
                if (!receiverId || !message)
                    return;
                io.to(receiverId).emit("message:received", message);
                io.to(receiverId).emit("message:delivered", {
                    messageId: message._id,
                });
                const conversation =
                    await Conversation.findById(
                        message.conversationId
                    );
                if (!conversation)
                    return;
                const currentUnread =
                    conversation.unreadCount.get(
                        receiverId.toString()
                    ) || 0;

                conversation.unreadCount.set(
                    receiverId.toString(),
                    currentUnread,
                );
                conversation.lastMessage =
                    message._id;
                conversation.lastMessageAt =
                    new Date();

                await conversation.save();

                const payload = {
                    conversationId:
                        conversation._id,

                    lastMessage: message,

                    unreadCount:
                        Object.fromEntries(
                            conversation.unreadCount
                        ),
                };

                // receiver
                io.to(receiverId).emit(
                    "conversation:update",
                    payload
                );

                // sender
                io.to(socket.userId).emit(
                    "conversation:update",
                    payload
                );

                // Calls get their own call:incoming signal — a notification
                // row for the call_log message would just be noise. Muted
                // conversations skip the notification entirely.
                const isMuted = conversation.mutedBy?.get(
                    String(receiverId)
                );
                if (!isMuted && message.messageType !== "call_log") {
                    notify(io, {
                        recipient: receiverId,
                        sender: message.senderId,
                        type: "message",
                        verb: "sent you a message",
                    }).catch((err) =>
                        console.error("Error notifying message:", err)
                    );
                }
            }
        );

        // ==================================================
        // READ RECEIPTS
        // ==================================================

        socket.on(
            "message:read",
            async ({ receiverId, message }) => {

                console.log(receiverId, 'then message', message)
                const messageId = message._id;
                if (!receiverId || !message)
                    return;

                try {

                    const message =
                        await Message.findByIdAndUpdate(
                            messageId,
                            {
                                status: "read",
                                readAt: new Date(),
                            },
                            { new: true }
                        );

                    if (!message) return;

                    const conversation =
                        await Conversation.findById(
                            message.conversationId
                        );

                    if (conversation) {

                        conversation.unreadCount.set(
                            socket.userId.toString(),
                            0
                        );

                        await conversation.save();

                        const unreadCount =
                            Object.fromEntries(
                                conversation.unreadCount
                            );

                        io.to(socket.userId).emit(
                            "conversation:update",
                            {
                                conversationId:
                                    conversation._id,

                                lastMessage: message,
                                unreadCount,
                            }
                        );

                        io.to(receiverId).emit(
                            "conversation:update",
                            {
                                conversationId:
                                    conversation._id,
                                lastMessage: message,
                                unreadCount,
                            }
                        );
                    }

                    io.to(receiverId).emit(
                        "message:read_received",
                        {
                            messageId
                        }
                    );

                } catch (err) {
                    console.error(
                        "Read receipt error:",
                        err
                    );
                }
            }
        );


        socket.on(
            "conversation:read",
            async ({ conversationId, receiverId }) => {
                try {
                    const conversation =
                        await Conversation.findById(conversationId);
                    if (!conversation) return;
                    conversation.unreadCount.set(
                        String(socket.userId),
                        0
                    );
                    await conversation.save();
                    // mark messages as read
                    await Message.updateMany(
                        {
                            conversationId,
                            receiverId: socket.userId,
                            status: { $ne: "read" }
                        },
                        {
                            $set: {
                                status: "read",
                                readAt: new Date()
                            }
                        }
                    );
                    // notify sender
                    io.to(receiverId).emit(
                        "message:read_received",
                        {
                            conversationId,

                        }
                    );

                    const lastMessage = await Message.findOne({
                        conversationId
                    })
                        .sort({ createdAt: -1 })
                        .lean();
                    io.to(receiverId).emit(
                        "conversation:update",
                        {
                            conversationId: conversation._id,
                            lastMessage,
                            unreadCount: Object.fromEntries(
                                conversation.unreadCount
                            ),
                        }
                    );
                } catch (err) {
                    console.error(err);
                }
            }
        );
        // ==================================================
        // DELETE
        // ==================================================

        socket.on(
            "message:delete",
            async ({ messageId, receiverId }, callback) => {
                try {
                    const message = await Message.findById(messageId);

                    if (!message) {
                        if (callback) callback({ status: "error", message: "Message not found" });
                        return;
                    }

                    if (message.senderId !== socket.userId) {
                        if (callback) callback({ status: "error", message: "Not authorized" });
                        return;
                    }

                    message.isDeleted = true;
                    message.deletedAt = new Date();
                    await message.save();

                    io.to(receiverId).emit("message:deleted", { messageId });

                    if (callback) callback({ status: "ok" });
                } catch (err) {
                    console.error(err);
                    if (callback) callback({ status: "error" });
                }
            }
        );

        // ==================================================
        // REACTIONS
        // ==================================================

        socket.on(
            "message:react",
            async (
                {
                    messageId,
                    receiverId,
                    emoji,
                    action = "add",
                },
                callback
            ) => {
                try {
                    const message =
                        await Message.findById(messageId);

                    if (!message) {
                        if (callback) {
                            callback({
                                status: "error",
                                message: "Message not found",
                            });
                        }
                        return;
                    }

                    message.reactions =
                        message.reactions.filter(
                            (reaction) =>
                                reaction.userId !== socket.userId
                        );

                    if (action === "add") {
                        message.reactions.push({
                            userId: socket.userId,
                            emoji,
                        });
                    }

                    await message.save();

                    io.to(receiverId).emit(
                        "message:reacted",
                        {
                            messageId,
                            reactions: message.reactions,
                        }
                    );

                    if (callback) {
                        callback({
                            status: "ok",
                            reactions: message.reactions,
                        });
                    }
                } catch (err) {
                    console.error(err);

                    if (callback) {
                        callback({
                            status: "error",
                        });
                    }
                }
            }
        );

        // ==================================================
        // CALL EVENTS
        // ==================================================

        socket.on("call:start", async ({ receiverId, callType, offer, conversationId }) => {

            try {
                let conversation;

                // Find or create conversation
                if (!conversationId) {
                    conversation = await Conversation.findOne({
                        participants: {
                            $all: [
                                socket.userId,
                                receiverId,
                            ],
                        },
                    });

                    if (!conversation) {
                        conversation =
                            await Conversation.create({
                                participants: [
                                    socket.userId,
                                    receiverId,
                                ],
                                unreadCount: {
                                    [socket.userId]: 0,
                                    [receiverId]: 0,
                                },
                            });
                    }

                    conversationId =
                        conversation._id.toString();
                } else {
                    conversation =
                        await Conversation.findById(
                            conversationId
                        );
                }

                const callMessage =
                    await Message.create({
                        conversationId: conversation._id,
                        senderId: socket.userId,
                        receiverId,
                        messageType: "call_log",
                        callDetails: {
                            callType,
                            callStatus: "ringing",
                            duration: 0,
                        },
                    });

                activeCalls.set(socket.userId, {
                    callerId: socket.userId,
                    receiverId,
                    offer,
                    callType,
                    startedAt: Date.now(),
                    conversationId: conversation._id,
                    messageId: callMessage._id,
                });

                io.to(receiverId).emit("call:incoming", {
                    senderId: socket.userId,
                    callType,
                    offer,
                    conversationId: conversation._id,
                });

            }
            catch (err) {
                console.error(
                    "call:start error:",
                    err
                );
            }
        });

        socket.on("call:offer", (data) => {
            const { receiverId } = data;

            io.to(receiverId).emit("call:offer", {
                ...data,
                senderId: socket.userId,
            });
        });

        socket.on("call:answer", async (data) => {
            try {
                const { receiverId } = data;

                const call = activeCalls.get(receiverId);

                if (call) {
                    call.acceptedAt = Date.now();

                    const updatedMessage =
                        await Message.findByIdAndUpdate(
                            call.messageId,
                            {
                                $set: {
                                    "callDetails.callStatus":
                                        "accepted",
                                },
                            },
                            { new: true }
                        );
                }

                io.to(receiverId).emit("call:answer", {
                    ...data,
                    senderId: socket.userId,
                });

            }
            catch (err) {
                console.error(err);
            }


        });

        socket.on("call:ice_candidate", (data) => {
            const { receiverId } = data;

            io.to(receiverId).emit(
                "call:ice_candidate",
                {
                    ...data,
                    senderId: socket.userId,
                }
            );
        });

        socket.on(
            "call:end",
            async ({ receiverId }) => {
                try {
                    const call =
                        activeCalls.get(socket.userId) ||
                        activeCalls.get(receiverId);

                    if (!call) {
                        io.to(receiverId).emit(
                            "call:end"
                        );
                        return;
                    }

                    let callStatus = "cancelled";
                    let duration = 0;

                    if (call.acceptedAt) {
                        callStatus = "completed";

                        duration = Math.floor(
                            (Date.now() -
                                call.acceptedAt) /
                            1000
                        );
                    }

                    const updatedMessage =
                        await Message.findByIdAndUpdate(
                            call.messageId,
                            {
                                $set: {
                                    "callDetails.callStatus":
                                        callStatus,
                                    "callDetails.duration":
                                        duration,
                                },
                            },
                            { new: true }
                        );

                    io.to(call.callerId).emit(
                        "conversation:update",
                        {
                            conversationId:
                                call.conversationId,
                            lastMessage:
                                updatedMessage,
                        }
                    );

                    io.to(call.receiverId).emit(
                        "conversation:update",
                        {
                            conversationId:
                                call.conversationId,
                            lastMessage:
                                updatedMessage,
                        }
                    );

                    io.to(receiverId).emit(
                        "call:end"
                    );

                    activeCalls.delete(
                        call.callerId
                    );

                } catch (err) {
                    console.error(
                        "call:end error:",
                        err
                    );
                }
            }
        );
        socket.on("call:reject", async ({ receiverId }) => {
            try {
                const call =
                    activeCalls.get(socket.userId) ||
                    activeCalls.get(receiverId);

                if (!call) {
                    io.to(receiverId).emit("call:end");
                    return;
                }

                const updatedMessage =
                    await Message.findByIdAndUpdate(
                        call.messageId,
                        {
                            $set: {
                                "callDetails.callStatus": "rejected",
                                "callDetails.duration": 0,
                            },
                        },
                        { new: true }
                    );

                io.to(call.callerId).emit("conversation:update", {
                    conversationId: call.conversationId,
                    lastMessage: updatedMessage,
                });

                io.to(call.receiverId).emit("conversation:update", {
                    conversationId: call.conversationId,
                    lastMessage: updatedMessage,
                });

                io.to(receiverId).emit("call:end");

                activeCalls.delete(call.callerId);
            } catch (err) {
                console.error("call:reject error:", err);
            }
        });

        // ==================================================
        // DISCONNECT
        // ==================================================

        socket.on("disconnect", () => {
            if (socket.userId) {
                const sockets = onlineUsers.get(socket.userId);
                if (sockets) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        onlineUsers.delete(socket.userId);
                    }
                }

                // Only announce "offline" once every socket for this user
                // (all open tabs/devices) has disconnected.
                if (!onlineUsers.has(socket.userId)) {
                    socket.broadcast.emit(
                        "user:status_changed",
                        {
                            userId: socket.userId,
                            status: "offline",
                        }
                    );
                }
            }

        });
    });
};