
const mongoose = require('mongoose');

const keysSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Muser' },
  publicKey: { type: Buffer },
  encryptedPrivateKey: { type: Buffer },
  salt: { type: Buffer },
  iv: { type: Buffer }

});

module.exports = mongoose.model('keysModel', keysSchema);