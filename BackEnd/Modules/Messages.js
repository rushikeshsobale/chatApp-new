const mongoose = require("mongoose");
const { Schema, model } = mongoose;

// Reaction schema
const ReactionSchema = new Schema(
  {
    userId: { type: String, required: true },
    emoji: { type: String, required: true },
    reactedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Message schema
const MessageSchema = new Schema(
  {
    chatId: { type: String },
    groupId: { type: String },
    senderId: { type: String, required: true, ref: 'Muser', },
    receiverId: { type: String }, // Optional for group messages
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    messageType: { type: String, enum: ["text", "image", "video", "file"], default: "text" },
    status: { type: String, enum: ["sent", "delivered", "read", "deleteForMe","deleteForEveryone"], default: "sent" },
    attachment: {
      name: { type: String },
      type: { type: String, enum: ['image', 'video', 'file'], default: 'file' },
     
    },
    hash: { type: String, required: false },
    reactions: [ReactionSchema], // Embedded reactions
  },
  { timestamps: true }
);

// Indexing for performance
MessageSchema.index({ chatId: 1, timestamp: -1 });

module.exports = model("messages", MessageSchema);
