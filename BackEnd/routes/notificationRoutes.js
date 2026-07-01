const express = require('express');
const router = express.Router();
const Notification = require('../Modules/Notifications');
const verifyToken = require('./verifyToken.js');

// A notification's `sender` is always the authenticated caller (the actor
// performing the action) — trusting a body-supplied sender would let
// anyone forge notifications as anyone else. `recipient` is legitimately
// someone other than the caller (that's the point of a notification).
router.post('/create', verifyToken, async (req, res) => {
    const { recipient, type, post, message } = req.body;
    try {
        const notification = new Notification({
            recipient,
            sender: req.decoded.userId,
            type,
            post,
            message: message || '', // Handle message as a strings
            read: false,
            createdAt: new Date()
        });
        await notification.save();
        res.status(201).json(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

const mongoose = require('mongoose');
router.get('/fetch/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }
    if (id !== req.decoded.userId) {
        return res.status(403).json({ error: 'Not authorized to view these notifications' });
    }
    try {
        const notifications = await Notification.find({ recipient: id })
            .populate('sender', 'userName profilePicture');
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { read } = req.body;
    try {
        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        if (notification.recipient.toString() !== req.decoded.userId) {
            return res.status(403).json({ error: 'Not authorized to update this notification' });
        }
        notification.read = read;
        await notification.save();
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Add delete notification endpoint
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        if (notification.recipient.toString() !== req.decoded.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this notification' });
        }
        await notification.deleteOne();
        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;


