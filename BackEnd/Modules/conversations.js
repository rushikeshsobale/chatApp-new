const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
{
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Muser",
      required: true
    }
  ],

  isGroup: {
    type: Boolean,
    default: false
  },

  groupName: {
    type: String
  },

  groupAvatar: {
    type: String
  },

  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Muser"
  },

  lastMessageAt: {
    type: Date
  },

  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "messages"
  },
encryptedKeys: [
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Muser",
      required: true
    },
    encryptedKey: {
      type: String,
      required: true
    }
  }
],
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }

},
{
  timestamps: true
});

module.exports = mongoose.model("Conversation", conversationSchema);