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
  },

  // Per-user mute/archive — same rationale as clearedAt: these are
  // preferences about one participant's view of the conversation, not
  // shared state between participants.
  mutedBy: {
    type: Map,
    of: Boolean,
    default: {}
  },

  archivedBy: {
    type: Map,
    of: Boolean,
    default: {}
  }

},
{
  timestamps: true
});

// Map fields (unreadCount, clearedAt, mutedBy, archivedBy) otherwise
// serialize to `{}` over JSON — Map has no enumerable own properties, so
// JSON.stringify() drops its contents unless explicitly flattened. The
// list endpoint sidesteps this via .lean(), but any route returning a
// live document (e.g. GET /:id, PATCH /:id/mute) needs this. Both
// transforms are needed: signMediaResponse's signDeep() calls
// .toObject() directly, which doesn't inherit the toJSON transform.
conversationSchema.set("toJSON", { flattenMaps: true });
conversationSchema.set("toObject", { flattenMaps: true });

// Every conversation-list load and call-start queries by participants.
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);