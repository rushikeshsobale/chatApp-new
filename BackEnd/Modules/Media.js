// models/Media.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
  },
  url: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Media', mediaSchema);
