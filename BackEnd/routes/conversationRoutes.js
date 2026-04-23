const express = require("express");
const Conversation = require("../Modules/conversations");
const auth = require("./verifyToken.js");
const router = express.Router();
const { uploadToS3 } = require("../utils/s3Upload");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const conversations = await Conversation.find({
      participants: userId
    })
      .sort({ lastMessageAt: -1 })
      .populate({
        path: "participants",
        select: "userName profilePicture"
      })
      .populate("lastMessage")
      .lean();
    const optimizedConversations = conversations.map((conv) => {
      const myKey = conv.encryptedKeys.find(
        (k) => k.userId.toString() === userId.toString()
      );
      return {
        ...conv,
        encryptedGroupKey: myKey ? myKey.encryptedKey : null,
        encryptedKeys: undefined // optional: remove completely
      };
    });
    res.json(optimizedConversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});
router.post("/", auth, upload.single("groupAvatar"), async (req, res) => {
  try {
    const currentUserId = req.decoded.userId;
    let { groupName, participants, encryptedKeys } = req.body;
    let mediaUrl = null;
    if (typeof encryptedKeys === "string") {
  encryptedKeys = JSON.parse(encryptedKeys);
}
    if (typeof participants === "string") {
      participants = JSON.parse(participants);
    }
    if (req.file) {
      const uploadResult = await uploadToS3(req.file, {
        folder: "groups",
        checkDuplicate: false,
        generateUniqueName: true
      });

      mediaUrl = uploadResult.url;
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({ message: "Participants required" });
    }

    // remove duplicates + add current user
    const finalParticipants = [
      ...new Set([...participants, currentUserId])
    ].filter(Boolean);

    // -------------------
    // PRIVATE CHAT
    // -------------------
    if (!groupName && finalParticipants.length === 2) {

      const sortedParticipants = [...finalParticipants].sort();

      let conversation = await Conversation.findOne({
        participants: sortedParticipants,
        isGroup: false
      });

      if (!conversation) {

        const unread = {};
        sortedParticipants.forEach(id => unread[id] = 0);

        conversation = await Conversation.create({
          participants: sortedParticipants,
          isGroup: false,
          unreadCount: unread
        });
      }

      return res.json(conversation);
    }

    // -------------------
    // GROUP CHAT
    // -------------------
    if (groupName && finalParticipants.length >= 2) {
    
      const unread = {};
      finalParticipants.forEach(id => unread[id] = 0);
      const conversation = await Conversation.create({
        participants: finalParticipants,
        groupName,
        groupAvatar: mediaUrl|| 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
        isGroup: true,
        groupAdmin: currentUserId,
        encryptedKeys: encryptedKeys || null,
        unreadCount: unread
      });
      return res.json(conversation);
    }
    res.status(400).json({ message: "Invalid request" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/:id", auth, async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate("participants", "userName profilePicture")
  if (!conversation) {
    return res.status(404).json({ message: "Not found" });
  }
  

  if (!conversation.participants.some(
    p => p._id.toString() === req.decoded.userId
  )) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json(conversation);
});
router.patch("/:id/read", auth, async (req, res) => {
  const userId = req.decoded.userId;

  await Conversation.updateOne(
    { _id: req.params.id },
    { $set: { [`unreadCount.${userId}`]: 0 } }
  );

  res.json({ success: true });
});
router.delete("/:id", auth, async (req, res) => {
  await Conversation.deleteOne({
    _id: req.params.id,
    participants: req.decoded.userId
  });

  res.json({ success: true });
});
module.exports = router
