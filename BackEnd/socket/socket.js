const Message = require("../Modules/Messages");
const Conversation = require("../Modules/conversations");
// userId -> socketId
const onlineUsers = new Map();

module.exports = (io) => {
    io.on("connection", (socket) => {

        socket.on("user:init", (userId) => {
            if (!userId) return;

            socket.userId = userId;

            onlineUsers.set(userId, socket.id);

            socket.join(userId);
            socket.emit(
                "online_users",
                Array.from(onlineUsers.keys()).map(id => ({
                    userId: id,
                    status: "online"
                }))
            );
            // Notify everyone else
            socket.broadcast.emit("user:status_changed", {
                userId,
                status: "online",
            });
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

        const activeCalls = new Map();

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
        socket.on("call:reject", async (recieverId) => {
            const call =
                activeCalls.get(socket.userId) ||
                activeCalls.get(receiverId);

            if (call) {
                const duration =
                    call.acceptedAt
                        ? Math.floor(
                            (Date.now() - call.acceptedAt) / 1000
                        )
                        : 0
                await Message.create({
                    sender: call.callerId,
                    receiver: call.receiverId,
                    type: "call",
                    callData: {
                        callType,
                        status: "rejected",
                        duration: 0,
                    }
                });
            }
        });

        // ==================================================
        // DISCONNECT
        // ==================================================

        socket.on("disconnect", () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);

                socket.broadcast.emit(
                    "user:status_changed",
                    {
                        userId: socket.userId,
                        status: "offline",
                    }
                );

            }

        });
    });
};