const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Friend-related routes
router.get('/friends/:userId', auth, userController.getFriends);
router.get('/search', auth, userController.searchUsers);
router.post('/addFriend', auth, userController.addFriend);
router.post('/removeFriend', auth, userController.removeFriend);

module.exports = router; 