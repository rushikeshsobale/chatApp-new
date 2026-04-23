const express = require('express');
const router = express.Router();
const Relationship = require("../Modules/relationships");
const verifyToken = require("./verifyToken.js");
router.post("/", verifyToken , async (req, res) => {
  try {
    const requester = req.decoded.userId;
    const { recipientId, type } = req.body;
    if (requester === recipientId)
      return res.status(400).json({ message: "Cannot connect with yourself" });
    const existing = await Relationship.findOne({
      requester,
      recipient: recipientId, 
      type,
    });
    if (existing)
      return res.json({ status: existing.status });
    const status = type === "follow" ? "accepted" : "pending"; // adjust for private profile
    const relationship = await Relationship.create({
      requester,
      recipient: recipientId,
      type,
      status,
    });
    res.json(relationship);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/accept", verifyToken, async (req, res) => {
  try {
    const relationship = await Relationship.findById(req.params.id);

    if (!relationship)
      return res.status(404).json({ message: "Request not found" });

    if (relationship.recipient.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    relationship.status = "accepted";
    await relationship.save();

    res.json(relationship);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/reject", verifyToken, async (req, res) => {
  try {
    const relationship = await Relationship.findById(req.params.id);

    if (!relationship)
      return res.status(404).json({ message: "Request not found" });

    if (relationship.recipient.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    relationship.status = "rejected";
    await relationship.save();

    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:targetUserId", verifyToken, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const targetUserId =req.params.targetUserId;
    const type = 'follow';
    await Relationship.findOneAndDelete({
      type,
      $or: [
        { requester: userId, recipient: targetUserId },
        { requester: targetUserId, recipient: userId },
      ],
    });

    res.json({ message: "Relationship removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/followers/:userId", async (req, res) => {
  const followers = await Relationship.find({
    recipient: req.params.userId,
    type: "follow",
    status: "accepted",
  }).populate("requester", "userName profilePicture");

  res.json(followers);
});

router.get("/following/:userId", async (req, res) => {
  const following = await Relationship.find({
    requester: req.params.userId,
    type: "follow",
    status: "accepted",
  }).populate("recipient", "userName profilePicture");

  res.json(following);
});

router.get("/requests", verifyToken, async (req, res) => {
  const requests = await Relationship.find({
    recipient: req.user.id,
    status: "pending",
  }).populate("requester", "userName profilePicture");

  res.json(requests);
})

router.get("/status/:targetUserId", verifyToken, async (req, res) => {
  const userId = req.decoded.userId;
  const targetUserId = req.params.targetUserId;

  try {
    // Check outgoing relationship (A → B)
    const outgoing = await Relationship.findOne({
      requester: userId,
      recipient: targetUserId,
    });

    // Check incoming relationship (B → A)
    const incoming = await Relationship.findOne({
      requester: targetUserId,
      recipient: userId,
    });

    // 1. Mutual Friends
    if (
      outgoing?.type === "friend" &&
      outgoing.status === "accepted" &&
      incoming?.type === "friend" &&
      incoming.status === "accepted"
    ) {
      return res.json({ state: "friends" });
    }
 
    // 2. Follow Back
    if (   
      incoming?.type === "follow" &&
      incoming.status === "accepted" &&
      !(outgoing?.type === "follow" && outgoing.status === "accepted")
    ) {
      return res.json({ state: "follow_back" });
    }

    // 3. Requested (by current user)
    if (
      outgoing?.status === "pending"
    ) {
      return res.json({ state: "requested" });
    }

    // 4. Accept Request (by target user)
    if (
      incoming?.status === "pending"
    ) {
      return res.json({ state: "accept_request" });
    }

    // 5. Following (current user follows target)
    if (
      outgoing?.type === "follow" &&
      outgoing.status === "accepted"
    ) {
      return res.json({ state: "following" });
    }

    // 6. None
    return res.json({ state: "none" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/friends/:userId", async (req, res) => {
  const friends = await Relationship.find({
    type: "friend",
    status: "accepted",
    $or: [
      { requester: req.params.userId },
      { recipient: req.params.userId },
    ],
  }).populate("requester recipient", "userName profilePicture");

  res.json(friends);
});
module.exports = router;
