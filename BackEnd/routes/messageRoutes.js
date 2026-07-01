const express = require('express');
const router = express.Router();
const Message = require('../Modules/Messages');
const verifyToken = require('./verifyToken');
const { uploadToS3 } = require("../utils/s3Upload");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const Conversation = require('../Modules/conversations');

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

      const messages =
        await Message.find({
          conversationId,
          isDeleted: false
        })
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
module.exports = router;