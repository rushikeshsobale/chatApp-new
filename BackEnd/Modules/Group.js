const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Muser',
      required: true,
    },
  ],
  admins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Muer',
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Muserser',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Group', GroupSchema);
