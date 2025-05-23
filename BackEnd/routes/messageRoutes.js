const express = require('express');
const router = express.Router();
const Messages = require('../Modules/Messages');
const verifyToken  = require('./verifyToken');

// Get messages between two users
router.get('/getMessages', verifyToken, async (req, res) => {
    try {
        const { senderId, receiverId, page = 1, limit = 20 } = req.query;
        
        const messages = await Messages.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a new message
router.post('/postMessage', verifyToken, async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;
        let attachment = null;

        // Handle file upload if present
        if (req.file) {
            attachment = req.file.path;
        }

        const newMessage = new Messages({
            senderId,
            receiverId,
            content,
            attachment,
            status: 'sent',
            timestamp: new Date()
        });

        const savedMessage = await newMessage.save();
        res.status(201).json(savedMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Update message status (read/delivered)
router.post('/updateMsgStatus', verifyToken, async (req, res) => {
    try {
        const { senderId, receiverId, status } = req.body;

        const messages = await Messages.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(15);

        const messageIds = messages.map(msg => msg._id);

        await Messages.updateMany(
            { _id: { $in: messageIds } },
            { $set: { status } }
        );

        res.status(200).json({ message: 'Message status updated successfully' });
    } catch (error) {
        console.error('Error updating message status:', error);
        res.status(500).json({ error: 'Failed to update message status' });
    }
});

// Delete a message
router.delete('/deleteMessage/:messageId', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body; // To verify ownership

        const message = await Messages.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Verify that the user is the sender
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        await Messages.findByIdAndDelete(messageId);
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

        const message = await Messages.findById(messageId);
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
        // Verify that the user is part of the chat
        const message = await Messages.findOne({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        });

        if (!message) {
            return res.status(404).json({ error: 'Chat not found or unauthorized' });
        }

        await Messages.deleteMany({
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