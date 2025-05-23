const express = require('express');
const router = express.Router();
const Notification = require('../Modules/Notifications');

router.post('/create', async (req, res) => {
   
    const { recipient, sender, type, post, message } = req.body;
    try {
        const notification = new Notification({ 
            recipient, 
            sender, 
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
router.get('/fetch/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
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

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { read } = req.body;
    try {
        const notification = await Notification.findByIdAndUpdate(id, { read }, { new: true });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
}); 

// Add delete notification endpoint
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Notification.findByIdAndDelete(id);
        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;


