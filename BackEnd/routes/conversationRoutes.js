const express = require("express");
const Conversation = require("../Modules/conversations");
const Message = require("../Modules/Messages");
const auth = require("./verifyToken.js");
const router = express.Router();
const { uploadToS3, deleteFromS3 } = require("../utils/s3Upload");
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
        select: "userName profilePicture  publicKey"
      })
      .populate("lastMessage")
      .lean();
    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});
router.post("/", auth, upload.single("groupAvatar"), async (req, res) => {
  try {
    const currentUserId = req.decoded.userId;
    let { groupName, participants, encryptedKeys } = req.body;
    let mediaKey = null;
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

      mediaKey = uploadResult.key;
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

      await conversation.populate({ path: "participants", select: "userName profilePicture publicKey" });
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
        groupAvatar: mediaKey || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
        isGroup: true,
        groupAdmin: currentUserId,
        encryptedKeys: encryptedKeys || null,
        unreadCount: unread
      });

      // Sent immediately into GroupChatUi without a refetch — it needs
      // populated {userName, ...} per member to label senders, not just
      // raw ids, or every message shows the sender as "Unknown".
      await conversation.populate({ path: "participants", select: "userName profilePicture publicKey" });
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
    .populate("participants", "userName profilePicture publickey")
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
    { _id: req.params.id, participants: userId },
    { $set: { [`unreadCount.${userId}`]: 0 } }
  );

  res.json({ success: true });
});
router.patch("/:id/mute", auth, async (req, res) => {
  const userId = req.decoded.userId;
  const { muted } = req.body;

  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, participants: userId },
    { $set: { [`mutedBy.${userId}`]: !!muted } },
    { new: true }
  )
    .populate({ path: "participants", select: "userName profilePicture publicKey" })
    .populate("lastMessage");

  if (!conversation) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json(conversation);
});
router.patch("/:id/archive", auth, async (req, res) => {
  const userId = req.decoded.userId;
  const { archived } = req.body;

  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, participants: userId },
    { $set: { [`archivedBy.${userId}`]: !!archived } },
    { new: true }
  )
    .populate({ path: "participants", select: "userName profilePicture publicKey" })
    .populate("lastMessage");

  if (!conversation) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json(conversation);
});
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    if (!conversation.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    // Only the group admin can delete a group outright. (1:1 conversations
    // have no admin concept — any participant may still delete those.)
    if (conversation.isGroup && conversation.groupAdmin?.toString() !== userId) {
      return res.status(403).json({ message: "Only the group admin can delete this group" });
    }

    const messages = await Message.find({ conversationId: conversation._id });
    await Promise.all(
      messages
        .filter(m => m.attachment?.url)
        .map(m => deleteFromS3(m.attachment.url).catch(err =>
          console.error("Failed to delete attachment during group delete:", err)
        ))
    );
    await Message.deleteMany({ conversationId: conversation._id });

    const participantIds = conversation.participants.map(p => p.toString());
    await conversation.deleteOne();

    const io = req.app.get("io");
    participantIds.forEach(id => io.to(id).emit("group:deleted", { conversationId: req.params.id }));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete conversation" });
  }
});

// -------------------
// GROUP MEMBERSHIP MANAGEMENT
// -------------------

// Admin adds a member. The new member's wrapped copy of the group's shared
// key is generated client-side (the admin already holds the unwrapped key)
// and just stored here — the server never sees the key itself.
router.patch("/:id/members", auth, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const { userId: newUserId, encryptedKey } = req.body;

    if (!newUserId || !encryptedKey) {
      return res.status(400).json({ message: "userId and encryptedKey are required" });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (conversation.groupAdmin?.toString() !== userId) {
      return res.status(403).json({ message: "Only the group admin can add members" });
    }
    if (conversation.participants.some(p => p.toString() === newUserId)) {
      return res.status(409).json({ message: "Already a member" });
    }

    conversation.participants.push(newUserId);
    conversation.encryptedKeys.push({ userId: newUserId, encryptedKey });
    conversation.unreadCount.set(newUserId, 0);
    await conversation.save();
    await conversation.populate({ path: "participants", select: "userName profilePicture publicKey" });

    const io = req.app.get("io");
    conversation.participants
      .map(p => p._id.toString())
      .forEach(id => io.to(id).emit("group:updated", { conversation }));

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add member" });
  }
});

// Admin removes someone else. (No key rotation — the removed member simply
// stops receiving future messages via the server; see project notes on
// the group E2EE design's known limitations.)
router.delete("/:id/members/:memberId", auth, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const { memberId } = req.params;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (conversation.groupAdmin?.toString() !== userId) {
      return res.status(403).json({ message: "Only the group admin can remove members" });
    }
    if (memberId === userId) {
      return res.status(400).json({ message: "Use the leave endpoint to remove yourself" });
    }

    conversation.participants = conversation.participants.filter(p => p.toString() !== memberId);
    conversation.encryptedKeys = conversation.encryptedKeys.filter(k => k.userId.toString() !== memberId);
    conversation.unreadCount.delete(memberId);
    await conversation.save();
    await conversation.populate({ path: "participants", select: "userName profilePicture publicKey" });

    const io = req.app.get("io");
    io.to(memberId).emit("group:removed", { conversationId: conversation._id });
    conversation.participants
      .map(p => p._id.toString())
      .forEach(id => io.to(id).emit("group:updated", { conversation }));

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove member" });
  }
});

// Any member removes themselves. If the admin leaves, admin-ship passes to
// the next remaining member; if nobody's left, the group is deleted.
router.delete("/:id/leave", auth, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!conversation.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: "Not a member" });
    }

    conversation.participants = conversation.participants.filter(p => p.toString() !== userId);
    conversation.encryptedKeys = conversation.encryptedKeys.filter(k => k.userId.toString() !== userId);
    conversation.unreadCount.delete(userId);

    const io = req.app.get("io");
    io.to(userId).emit("group:removed", { conversationId: conversation._id });

    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId: conversation._id });
      await conversation.deleteOne();
      return res.json({ success: true, deleted: true });
    }

    if (conversation.groupAdmin?.toString() === userId) {
      conversation.groupAdmin = conversation.participants[0];
    }

    await conversation.save();
    await conversation.populate({ path: "participants", select: "userName profilePicture publicKey" });

    conversation.participants
      .map(p => p._id.toString())
      .forEach(id => io.to(id).emit("group:updated", { conversation }));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to leave group" });
  }
});

// Admin renames the group and/or changes its avatar.
router.patch("/:id/group-info", auth, upload.single("groupAvatar"), async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const { groupName } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (conversation.groupAdmin?.toString() !== userId) {
      return res.status(403).json({ message: "Only the group admin can edit this group" });
    }

    if (groupName) conversation.groupName = groupName;

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, {
        folder: "groups",
        checkDuplicate: false,
        generateUniqueName: true
      });
      conversation.groupAvatar = uploadResult.key;
    }

    await conversation.save();
    await conversation.populate({ path: "participants", select: "userName profilePicture publicKey" });

    const io = req.app.get("io");
    conversation.participants
      .map(p => p._id.toString())
      .forEach(id => io.to(id).emit("group:updated", { conversation }));

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update group" });
  }
});

module.exports = router
