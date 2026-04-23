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
        enum: ['friend', 'follow'],
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
module.exports = mongoose.model('Relationship', Relationship);