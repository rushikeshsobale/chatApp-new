const express = require('express');
const router = express.Router();
const Message = require('../Modules/Messages');
const verifyToken = require('./verifyToken');
const { uploadToS3 } = require("../utils/s3Upload");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const Conversation = require('../Modules/conversations')
// Get messages between two users
router.get('/getMessages', verifyToken, async (req, res) => {
    try {
        const { conversationId, page = 1, limit = 20 } = req.query;

        if (!conversationId) {
            return res.status(400).json({ error: 'conversationId is required' });
        }

        const skipCount = (parseInt(page) - 1) * parseInt(limit);

        const messages = await Message.find({ conversationId })
            .populate("senderId", "userName profilePicture")
            .sort({ createdAt: -1 })
            .skip(skipCount)
            .limit(parseInt(limit));

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post("/postMessage", upload.single("attachment"), async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;
        if (!receiverId) {
            return res.status(400).json({ message: "Receiver required" });
        }
        const participants = [senderId, receiverId].sort();
        let conversation = await Conversation.findOne({ participants });
        if (!conversation) {
            conversation = await Conversation.create({
                participants,
                unreadCount: {
                    [senderId]: 0,
                    [receiverId]: 0
                }
            });
        }

        // 🔹 3️⃣ Handle attachment upload (if any)
        let attachment = null;

        if (req.file) {
            const uploadResult = await uploadToS3(req.file, {
                folder: "posts",
                checkDuplicate: true
            });

            const mimeType = req.file.mimetype;
            let type = "file";

            if (mimeType.startsWith("image/")) type = "image";
            else if (mimeType.startsWith("video/")) type = "video";

            attachment = {
                name: uploadResult.url,
                type
            };
        }

        // 🔹 4️⃣ Create Message
        const newMessage = await Message.create({
            conversationId: conversation._id,
            senderId,
            receiverId,
            content,
            attachment,
            status: "sent"
        });

        // 🔹 5️⃣ Update Conversation and return updated doc
        const updatedConversation = await Conversation.findByIdAndUpdate(
            conversation._id,
            {
                lastMessage: newMessage._id,
                lastMessageAt: new Date(),
                $inc: { [`unreadCount.${receiverId}`]: 1 }
            },
            { new: true } // ✅ important
        );

        // 🔹 Send both message + updated conversation
        res.status(201).json({
            message: newMessage,
            conversation: updatedConversation
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

router.post("/postGroupMessage", upload.single("attachment"), async (req, res) => {
  try {
    const { senderId, groupId, content } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: "GroupId required" });
    }

    let attachment = null;

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, {
        folder: "posts",
        checkDuplicate: true
      });

      const mimeType = req.file.mimetype;
      let type = "file";

      if (mimeType.startsWith("image/")) type = "image";
      else if (mimeType.startsWith("video/")) type = "video";

      attachment = {
        name: uploadResult.url,
        type
      };
    }

    // ✅ Create message
    const newMessage = await Message.create({
      conversationId: groupId,
      senderId,
      content,
      attachment,
      status: "sent"
    });

    // ✅ Populate sender (IMPORTANT for UI consistency)
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "userName profilePicture");

    // ✅ Update conversation
    await Conversation.findByIdAndUpdate(groupId, {
      lastMessage: newMessage._id,
      lastMessageAt: new Date()
    });

    // 🔥 RETURN ONLY MESSAGE (CLEAN)
    res.status(201).json(populatedMessage);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send group message" });
  }
});
// ✅ 2. Get messages from a chat (paginated)
router.get("/getMessages/:chatId", async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const messages = await Message.find({ chatId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.status(200).json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});


// Update message status (read/delivered)
router.post('/updateMsgStatus', verifyToken, async (req, res) => {
    try {
        const { messageIds, status } = req.body;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ error: 'messageIds array is required and cannot be empty' });
        }

        await Message.updateMany(
            { _id: { $in: messageIds } },
            { $set: { status: status || 'read' } }  // default to 'read' if status not provided
        );

        res.status(200).json({ message: 'Message status updated successfully' });
    } catch (error) {
        console.error('Error updating message status:', error);
        res.status(500).json({ error: 'Failed to update message status' });
    }
});


router.get('/unseenMessages', async (req, res) => {
    const { receiverId } = req.query;

    if (!receiverId) {
        return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    try {
        const unseenMessages = await Message.find({
            status: 'sent',
            receiverId: receiverId
        });

        res.status(200).json({
            success: true,
            messages: unseenMessages
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
})
// Delete a message
router.delete('/deleteMessage/:messageId', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body; // To verify ownership

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Verify that the user is the sender
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        await Message.findByIdAndDelete(messageId);
        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Add reaction to a message
router.post('/:messageId/reactions', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, emoji } = req.body;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
            r => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingReaction) {
            // Remove reaction if it exists
            message.reactions = message.reactions.filter(
                r => !(r.userId.toString() === userId && r.emoji === emoji)
            );
        } else {
            // Add new reaction
            message.reactions.push({ userId, emoji });
        }
        const updatedMessage = await message.save();
        res.status(200).json(updatedMessage);
    } catch (error) {
        console.error('Error updating message reaction:', error);
        res.status(500).json({ error: 'Failed to update message reaction' });
    }
});
// Clear chat history between two users
router.delete('/clearChat', verifyToken, async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        console.log(senderId, receiverId, 'd;eee')
        // Verify that the user is part of the chat
        const message = await Message.findOne({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        });

        if (!message) {
            return res.status(404).json({ error: 'Chat not found or unauthorized' });
        }

        await message.deleteMany({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        });

        res.status(200).json({ message: 'Chat history cleared successfully' });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

module.exports = router;