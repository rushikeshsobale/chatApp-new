const mongoose = require('mongoose');
require('./Muser');
const storySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Muser',
        required: true
    },
    media: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    caption: {
        type: String,
        default: ''
    },
    viewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Muser'
    }],
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
}, {
    timestamps: true
});

// Index for automatic deletion of expired stories
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema); 