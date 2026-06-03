const mongoose = require('mongoose');

const keysSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Muser',
    required: true,
    unique: true // Ensure a user can only have one active key backup document
  },
  encryptedMasterKey: { 
    type: String, 
    required: true 
  },
  salt: { 
    type: String, 
    required: true 
  },
  iv: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true // Automatically gives you createdAt and updatedAt tracking fields
});

module.exports = mongoose.model('keysModel', keysSchema);