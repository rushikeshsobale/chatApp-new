const express = require("express");
const Muser = require("../Modules/Muser.js");
const secretKey = process.env.JWT_SECRET || "mySecreateKey";
const router = express.Router();
const verifyToken = require("./verifyToken.js");
router.get("/suggestions", verifyToken, async (req, res) => {
 console.log(req.body, 'profileroutes')
  try {
    const users = await Muser.find(); // Retrieve all users
    const filteredUsers = users.filter(
      (user) => user._id.toString() !== req.decoded.userId
    );
    res.json(filteredUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/follow/:id", verifyToken, async (req, res) => {
    try {
        const userId = req.decoded.id; // Logged-in user
        const targetUserId = req.params.id; // User to follow

        if (userId === targetUserId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const user = await Muser.findById(userId);
        const targetUser = await Muser.findById(targetUserId);

        if (!user || !targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (targetUser.isPrivate) {
            // Private account: Send a follow request
            if (targetUser.followRequests.includes(userId)) {
                return res.status(400).json({ message: "Follow request already sent" });
            }
            targetUser.followRequests.push(userId);
            await targetUser.save();
            return res.json({ message: "Follow request sent" });
        } else {
            // Public account: Follow directly
            if (!user.following.includes(targetUserId)) {
                user.following.push(targetUserId);
                targetUser.followers.push(userId);
            }
            await user.save();
            await targetUser.save();
            return res.json({ message: "Followed successfully" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Accept or Deny Follow Request
router.post("/follow-request/:id", verifyToken, async (req, res) => {
    try {
        const userId = req.decoded.id; // Logged-in user
        const requesterId = req.params.id; // User who sent the request
        const { action } = req.body; // 'accept' or 'deny'

        const user = await Muser.findById(userId);
        const requester = await Muser.findById(requesterId);

        if (!user || !requester) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.followRequests.includes(requesterId)) {
            return res.status(400).json({ message: "No follow request from this user" });
        }

        if (action === "accept") {
            user.followers.push(requesterId);
            requester.following.push(userId);
        }

        // Remove request
        user.followRequests = user.followRequests.filter(id => id.toString() !== requesterId);
        await user.save();
        await requester.save();

        res.json({ message: action === "accept" ? "Follow request accepted" : "Follow request denied" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

