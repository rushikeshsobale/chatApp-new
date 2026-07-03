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
  },

  // Per-user "clear chat" cutoff — messages created at or before this
  // timestamp are hidden from that user's view only. Deliberately not a
  // shared/global delete: clearing your own view shouldn't remove the
  // conversation history for the other participant.
  clearedAt: {
    type: Map,
    of: Date,
    default: {}
  }

},
{
  timestamps: true
});

// Every conversation-list load and call-start queries by participants.
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);