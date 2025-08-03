const express = require("express");
const Muser = require("../Modules/Muser.js");
const secretKey = process.env.JWT_SECRET || "mySecreateKey";
const router = express.Router();
const verifyToken = require("./verifyToken.js");
const multer = require("multer");
const { uploadToS3 } = require("../utils/s3Upload");
const upload = multer({ storage: multer.memoryStorage() });
router.get("/userProfile/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.decoded.userId;
  if(!currentUserId || !userId){
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const user = await Muser.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isOwner = userId === currentUserId;
    const isFollower = user.followers.includes(currentUserId);
    // Always remove password field
    delete user.password;
    const basicInfo = {
      _id: user._id,
      userName: user.userName,
      profilePicture: user.profilePicture,
      bio: user.bio,
    };

    if (user.isPrivate && !isOwner && !isFollower) {
      return res.status(200).json({
        ...basicInfo,
        isPrivate: true,
        message: "This profile is private. Limited info shown.",
      });
    }

    res.status(200).json({
      ...user,
      isPrivate: false,
    });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/suggestions", verifyToken, async (req, res) => {
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
router.put("/updateUser/:userId", upload.single("profilePicture"), async (req, res) => {
  const { firstName, lastName, bio } = req.body;
  const { userId } = req.params;

  if (!userId || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: "User ID, First Name, and Last Name are required",
    });
  }
  try {
    let mediaUrl = null;
    if (req.file) {
      const uploadResult = await uploadToS3(req.file, {
        folder: "profiles",
        checkDuplicate: false, // Don't check duplicates for profile pictures
        generateUniqueName: true
      });
      mediaUrl = uploadResult.url;
    }
    const updatedData = {
      firstName,
      lastName,
      bio,
      profilePicture: mediaUrl || null,
    };

    const updatedUser = await Muser.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

router.post("/follow/:id", verifyToken, async (req, res) => {
    try {
        const userId = req.decoded.userId; // Logged-in user
        const targetUserId = req.params.id; // User to follow
        if (userId === targetUserId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }
        const user = await Muser.findById(userId);
        const targetUser = await Muser.findById(targetUserId);
        if (!user || !targetUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.following.includes(targetUserId)) {
          return res.status(400).json({ message: "Following already" });
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
        const userId = req.decoded.userId; // Logged-in user
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



router.get('/getBirthDays', async (req, res) => {
  const { userId } = req.query; // Use query params for GET

  try {
    // Step 1: Find the user and get the list of followed users
    const user = await Muser.findById(userId).select('following');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Step 2: Get today's date (day and month)
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // JS months are 0-based

    // Step 3: Find users followed by the current user whose birthdays are today
    const birthdaysToday = await Muser.find({
      _id: { $in: user.following },
      birthDate: {
        $exists: true,
        $ne: null
      }
    }).select('userName birthDate').lean();

    // Step 4: Filter users with birthDate matching today's day and month
    const result = birthdaysToday.filter(person => {
      const birthDate = new Date(person.birthDate);
      return (
        birthDate.getDate() === currentDay &&
        birthDate.getMonth() + 1 === currentMonth
      );
    });

    return res.status(200).json({ birthdays: result });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;