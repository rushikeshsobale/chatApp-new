const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    senderId: {
      type: String,
      ref: "Muser",
      required: true,
      index: true,
    },

    receiverId: {
      type: String,
      ref: "Muser",
      required: true,
      index: true,
    },

    // E2EE encrypted payload
    content: {
      type: String,
      default: "",
    },

    messageType: {
      type: String,
      enum: [
        "text",
        "image",
        "video",
        "file",
        "voice_call",
        "video_call",
        "call_log",
      ],
      default: "text",
    },

    attachment: {
      url: {
        type: String,
        default: null,
      },

      name: {
        type: String,
        default: null,
      },

      mimeType: {
        type: String,
        default: null,
      },

      size: {
        type: Number,
        default: 0,
      },
    },

    // Reply support
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "messages",
      default: null,
    },

    // Emoji reactions
    reactions: [
      {
        userId: {
          type: String,
          ref: "Muser",
        },

        emoji: {
          type: String,
          required: true,
        },

        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Delivery status
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    readAt: {
      type: Date,
      default: null,
    },

    // Call metadata
    callDetails: {
      callType: {
        type: String,
        enum: ["voice", "video"],
        default: null,
      },
      startedAt: Date,

      duration: {
        type: Number,
        default: 0,
      },

      callStatus: {
        type: String,
        enum: [
          "ringing",
          "answered",
          "missed",
          "rejected",
          "completed",
          "cancelled",
        ],
        default: null,
      },
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Useful indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ receiverId: 1, status: 1 });
MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ createdAt: -1 });

module.exports = model("messages", MessageSchema);