const express = require('express');
const router = express.Router();
const Message = require('../Modules/Messages');
const verifyToken = require('./verifyToken');
const { uploadToS3 } = require("../utils/s3Upload");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
// Get messages between two users
router.get('/getMessages', verifyToken, async (req, res) => {
    try {
        // Destructure query parameters, with default values for page and limit
        const { senderId, receiverId, groupId, page = 1, limit = 20 } = req.query;

        // Initialize an empty query object
        let query = {};

        // Check if groupId is provided in the request
        if (groupId) {
            // If groupId is present, construct the query for group messages
            // Assuming your Messages schema has a 'groupId' field
            query = { groupId: groupId };
        } else {
            // If groupId is not present, construct the query for direct messages
            // This handles messages sent by sender to receiver, or by receiver to sender
            query = {
                $or: [
                    { senderId: senderId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            };
        }

        // Calculate the number of documents to skip for pagination
        const skipCount = (parseInt(page) - 1) * parseInt(limit);
        const messages = await Message.find(query)
            .populate("senderId", "userName profilePicture")
            .sort({ createdAt: -1 }) // Sort by creation date, newest first
            .skip(skipCount)         // Skip documents for pagination
            .limit(parseInt(limit)); // Limit the number of documents per page

        // Send the fetched messages as a JSON response with a 200 status code
        res.status(200).json(messages);
    } catch (error) {
        // Log any errors that occur during the process
        console.error('Error fetching messages:', error);
        // Send an error response with a 500 status code
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post("/postMessage", upload.single("attachment"), async (req, res) => {
    try {
        const { chatId, groupId, senderId, receiverId, content } = req.body;
        let attachment = null;
        if (req.file) {
            const uploadResult = await uploadToS3(req.file, {
                folder: "posts",
                checkDuplicate: true
            });
            const mimeType = req.file.mimetype;   // e.g., "image/png" or "video/mp4"
            let type = "file";                    // default fallback
            if (mimeType.startsWith("image/")) {
                type = "image";
            } else if (mimeType.startsWith("video/")) {
                type = "video";
            }
            attachment = {
                name: uploadResult.url,
                type: type
            };
        }
        const newMessage = new Message({
            chatId,
            groupId,
            senderId,
            receiverId,
            content,
            attachment,   // 👈 storing whole object here
        });
        const response = await newMessage.save();
      
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ error: "Failed to send message" });
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