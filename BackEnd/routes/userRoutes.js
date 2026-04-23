const express = require("express");
const router = express.Router();
const User = require("../Modules/Muser");
const auth = require("./verifyToken");
const relations = require("../Modules/relationships");
router.get("/search", auth, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) {
      return res.json([]);
    }
    const users = await User.find({
      userName: { $regex: q, $options: "i" },
      _id: { $ne: req.decoded.userId }
    })
      .select("_id userName profilePicture")
      .limit(10);
    res.json(users);
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/friends", auth, async (req, res) => {
  try {
    const userId = req.decoded.userId;

    const relationsList = await relations
      .find({
        status: "accepted",
        $or: [
          { requester: userId },
          { recipient: userId }
        ]
      })
      .populate({
        path: "requester recipient",
        select: "_id userName profilePicture",
        populate: {
          path: "keysId",
          select: "publicKey"
        }
      });
    const friendMap = new Map();

    relationsList.forEach(rel => {
      const friend =
        rel.requester._id.toString() === userId
          ? rel.recipient
          : rel.requester;

      friendMap.set(friend._id.toString(), friend);
    });

    const friends = Array.from(friendMap.values());

    res.json(friends);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching friends" });
  }
});

module.exports = router;
