const mongoose = require('mongoose');

const Relationship = new mongoose.Schema({
    requester : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Muser',
    },
    recipient : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Muser',
    },
    type : {
        type: String,
        enum: ['friend', 'follow', 'block'],
        required: true
    },
    status : {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'block'],
        default: 'pending'
    }   
}, {
    timestamps: true,
});

// This is the hottest, most-queried collection in the app (friend/follow
// status, followers, following, friends list, pending requests, story
// feed gating all hit it) and previously had zero indexes — every query
// was a full collection scan.
Relationship.index({ requester: 1, recipient: 1, type: 1 });
Relationship.index({ recipient: 1, type: 1, status: 1 });
Relationship.index({ requester: 1, type: 1, status: 1 });

module.exports = mongoose.model('Relationship', Relationship);