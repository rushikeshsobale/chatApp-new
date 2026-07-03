const express = require('express');
const router = express.Router();
const Message = require('../Modules/Messages');
const verifyToken = require('./verifyToken');
const { uploadToS3, deleteFromS3 } = require("../utils/s3Upload");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const Conversation = require('../Modules/conversations');
const Relationship = require('../Modules/relationships');

router.post(
  "/postMessage",
  verifyToken,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const {
        receiverId,
        content,
        parentId,
        messageType
      } = req.body;
      // senderId is always the authenticated caller — trusting a
      // body-supplied senderId would let anyone send messages as anyone.
      const senderId = req.decoded.userId;

      if (!receiverId) {
        return res.status(400).json({
          message: "Receiver ID required"
        });
      }

      const blockRelationship = await Relationship.findOne({
        type: "block",
        $or: [
          { requester: senderId, recipient: receiverId },
          { requester: receiverId, recipient: senderId }
        ]
      });

      if (blockRelationship) {
        return res.status(403).json({
          message: "Cannot send message: user is blocked"
        });
      }

      const participants = [senderId, receiverId].sort();

      let conversation = await Conversation.findOne({
        participants
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants,
          unreadCount: {
            [senderId]: 0,
            [receiverId]: 0
          }
        });
      }

      let attachment = null;

      if (req.file) {
        const uploadResult = await uploadToS3(req.file, {
          folder: "messages",
          checkDuplicate: true
        });

        attachment = {
          url: uploadResult.key,
          name: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        };
      }

      const newMessage = await Message.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        content: content || "",
        messageType:
          messageType ||
          (req.file
            ? req.file.mimetype.startsWith("image/")
              ? "image"
              : req.file.mimetype.startsWith("video/")
              ? "video"
              : "file"
            : "text"),
        attachment,
        parentId: parentId || null,
        status: "sent"
      });

      await Conversation.findByIdAndUpdate(
        conversation._id,
        {
          lastMessage: newMessage._id,
          lastMessageAt: new Date(),
          $inc: {
            [`unreadCount.${receiverId}`]: 1
          }
        }
      );

      const populatedMessage =
        await Message.findById(newMessage._id)
          .populate(
            "parentId",
            "content senderId messageType"
          );

      return res.status(201).json({
        message: populatedMessage,
        conversationId: conversation._id
      });

    } catch (err) {
      console.error(err);

      return res.status(500).json({
        error: "Failed to send message"
      });
    }
  }
);

router.get(
  "/getMessages",
  verifyToken,
  async (req, res) => {
    try {

      const {
        conversationId,
        page = 1,
        limit = 20
      } = req.query;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (!conversation.participants.some(p => p.toString() === req.decoded.userId)) {
        return res.status(403).json({ error: "Not a participant in this conversation" });
      }

      const skip =
        (Number(page) - 1) *
        Number(limit);

      const messageFilter = {
        conversationId,
        isDeleted: false
      };

      // Hide anything at/before this user's own "clear chat" cutoff —
      // clearing is per-user, so this must never touch other participants.
      const clearedAt = conversation.clearedAt?.get(req.decoded.userId);
      if (clearedAt) {
        messageFilter.createdAt = { $gt: clearedAt };
      }

      const messages =
        await Message.find(messageFilter)
          .populate(
            "parentId",
            "content senderId messageType"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit));

      return res.status(200).json(messages);

    } catch (err) {
      console.error(err);

      return res.status(500).json({
        error: "Failed to fetch messages"
      });
    }
  }
);

router.patch(
  "/read/:messageId",
  verifyToken,
  async (req, res) => {
    try {

      const message = await Message.findById(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      if (message.receiverId.toString() !== req.decoded.userId) {
        return res.status(403).json({ error: "Not authorized to mark this message read" });
      }

      message.status = "read";
      message.readAt = new Date();
      await message.save();

      return res.json(message);

    } catch (err) {

      return res.status(500).json({
        error: err.message
      });

    }
  }
);

router.patch(
  "/react/:messageId",
  verifyToken,
  async (req, res) => {
    try {

      const { emoji } = req.body;

      const message =
        await Message.findById(req.params.messageId);

      if (!message) {
        return res.status(404).json({
          error: "Message not found"
        });
      }

      message.reactions =
        message.reactions.filter(
          r =>
            r.userId !== req.decoded.userId
        );

      message.reactions.push({
        userId: req.decoded.userId,
        emoji
      });

      await message.save();

      res.json(message);

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }
  }
);
router.delete(
  "/conversation/:conversationId/clear",
  verifyToken,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (!conversation.participants.some(p => p.toString() === req.decoded.userId)) {
        return res.status(403).json({ error: "Not a participant in this conversation" });
      }

      // Per-user cutoff, not a shared delete — the other participant's
      // view of the conversation is untouched.
      conversation.clearedAt.set(req.decoded.userId, new Date());
      await conversation.save();

      // Once EVERY participant has cleared past a given point, nobody's
      // view depends on those messages anymore — safe to actually purge
      // them (and their S3 attachments) instead of keeping soft-deleted
      // rows around forever. If even one participant hasn't cleared yet,
      // skip this entirely; their messages are untouched until they do.
      const participantIds = conversation.participants.map(p => p.toString());
      const cutoffs = participantIds.map(id => conversation.clearedAt.get(id));

      if (cutoffs.every(Boolean)) {
        const minClearedAt = new Date(Math.min(...cutoffs.map(d => new Date(d).getTime())));

        const purgeable = await Message.find({
          conversationId,
          createdAt: { $lte: minClearedAt }
        });

        if (purgeable.length) {
          await Promise.all(
            purgeable
              .filter(m => m.attachment?.url)
              .map(m => deleteFromS3(m.attachment.url).catch(err =>
                console.error("Failed to delete attachment during chat purge:", err)
              ))
          );

          const purgedIds = purgeable.map(m => m._id.toString());
          await Message.deleteMany({ _id: { $in: purgedIds } });

          if (conversation.lastMessage && purgedIds.includes(conversation.lastMessage.toString())) {
            const nextLastMessage = await Message.findOne({ conversationId })
              .sort({ createdAt: -1 });
            conversation.lastMessage = nextLastMessage?._id || null;
            conversation.lastMessageAt = nextLastMessage?.createdAt || null;
            await conversation.save();
          }
        }
      }

      return res.status(200).json({ message: "Chat cleared successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to clear chat" });
    }
  }
);

router.delete(
  "/:messageId",
  verifyToken,
  async (req, res) => {
    try {
      const message = await Message.findById(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      if (message.senderId !== req.decoded.userId) {
        return res.status(403).json({ error: "Not authorized to delete this message" });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      return res.status(200).json({ message: "Message deleted successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete message" });
    }
  }
);

module.exports = router;