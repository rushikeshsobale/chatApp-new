// router.js
require("dotenv").config();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();
const mongoose = require("mongoose");
const multer = require("multer");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Muser = require("../Modules/Muser.js");
const Post = require("../Modules/Post.js");
const cookieParser = require("cookie-parser");
const verifyToken = require("./verifyToken.js");
const Message = require("../Modules/Messages.js");
const Messages = require("../Modules/Messages.js");

const secretKey = process.env.JWT_SECRET || "mySecreateKey";
router.use(cookieParser());

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", (req, res) => {
  res.send("Alright");
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

router.get("/getProfileUser/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const objectId = new mongoose.Types.ObjectId(userId);

    const user = await Muser.findById(objectId).populate({
      path: "friends.friendId", // Populate the friendId field within friends array
      select: "firstName lastName email profilePicture", // Specify fields to include for each friend
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});


router.post("/sendRequest/:receiverId", verifyToken, async (req, res) => {
  try {
    const senderId = req.decoded.userId;
    const senderName = req.decoded.name;
    const receiverId = req.params.receiverId;
    const receiver = await Muser.findById(receiverId);
    const sender = await Muser.findById(senderId);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }
    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ message: "You cannot send a friend request to yourself" });
    }
    const alreadyFriends = sender.friends.find(
      (friend) => friend.friendId === receiverId
    );
    if (alreadyFriends) {
      return res.status(400).json({ message: "You are already friends" });
    }

    await Muser.findByIdAndUpdate(senderId, {
      $push: {
        friends: {
          friendId: receiverId,
          friendName: receiver.firstName,
          isFriend: "sent",
        },
      },
    });
    await Muser.findByIdAndUpdate(receiverId, {
      $push: {
        friends: {
          friendId: senderId,
          friendName: sender.firstName,
          isFriend: "recieved",
        },
      },
    });

    res.status(200).json({ message: "Request sent successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/acceptFriendRequest/:requesterId",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.decoded.userId;
      const requesterId = req.params.requesterId;
      const user = await Muser.findById(userId);
      const requester = await Muser.findById(requesterId);
      if (!user || !requester) {
        return res.status(404).json({ error: "User not found" });
      }
      const existingRequestIndex = user.friends.findIndex(
        (request) => request.friendId === requesterId
      );
      if (existingRequestIndex === -1) {
        return res
          .status(400)
          .json({ message: "No friend request from this user" });
      }
      await Muser.findByIdAndUpdate(
        userId,
        {
          $set: {
            "friends.$[elem].isFriend": "friends", // Update isFriend to true for the requester
          },
        },
        {
          arrayFilters: [{ "elem.friendId": requesterId }], // Match the requester in the friends array
          new: true,
        }
      );
      await Muser.findByIdAndUpdate(
        requesterId,
        {
          $set: {
            "friends.$[elem].isFriend": "friends", // Update isFriend to true for the user
          },
        },
        {
          arrayFilters: [{ "elem.friendId": userId }], // Match the user in the friends array
          new: true,
        }
      );
      res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
router.post("/sendMessage", async (req, res) => {
  const { sendId, message } = req.body;
  const receiverId = sendId; // Extract only the _id field from sendId
  const { text, senderId, senderName, status } = message;

  const newMessageForSender = {
    text,
    senderId,
    senderName,
    sentByCurrentUser: true,
    status,
    timestamp: new Date(),
  };
  const newMessageForReceiver = {
    text,
    senderId,
    senderName,
    sentByCurrentUser: false,
    timestamp: new Date(),
  };
  try {
    const user = await Muser.findById(senderId);
    const receiver = await Muser.findById(receiverId); // Use receiverId here
    if (user && receiver) {
      // Logic for sender
      if (!user.messages) {
        user.messages = {};
      }
      if (!user.messages[receiverId]) {
        user.messages[receiverId] = [];
      }
      user.messages[receiverId].push(newMessageForSender);
      // Save message to sender
      await Muser.findByIdAndUpdate(
        senderId,
        { messages: user.messages },
        { upsert: true }
      );
      // Logic for receiver
      if (!receiver.messages) {
        receiver.messages = {};
      }
      if (!receiver.messages[senderId]) {
        receiver.messages[senderId] = [];
      }
      receiver.messages[senderId].push(newMessageForReceiver);
      // Save message to receiver
      await Muser.findByIdAndUpdate(
        receiverId,
        { messages: receiver.messages },
        { upsert: true }
      );
      res.status(200).json({ message: "Message sent!" });
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/deleteRequest/:requesterId", verifyToken, async (req, res) => {
  try {
    const userId = req.decoded.userId; // The user who wants to delete the request
    const requesterId = req.params.requesterId; // The user who sent the request
    // Find the user and check for existing request
    const user = await Muser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Check if there is a pending friend request from the requester
    const existingRequestIndex = user.friendRequests.findIndex(
      (request) => request.senderId.toString() === requesterId
    );
    if (existingRequestIndex === -1) {
      return res
        .status(400)
        .json({ message: "No friend request from this user" });
    }
    user.friendRequests.splice(existingRequestIndex, 1);
    await Muser.findByIdAndUpdate(
      userId,
      { friendRequests: user.friendRequests },
      { new: true }
    );
    res
      .status(200)
      .json({ message: "Friend request deleted successfully", user });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/:userId/messages", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await Muser.findById(userId).select("messages");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// router.get('/getMessages/:userId', async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const user = await Muser.findById(userId);

//     if (user) {
//       res.status(200).json(user.messages || {});
//     } else {
//       res.status(404).json({ message: 'User not found.' });
//     }
//   } catch (error) {
//     console.error("Error retrieving messages:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });
router.post("/updateMessageStatus", async (req, res) => {
  const { userId, messageId, status } = req.body;
  try {
    const user = await Muser.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    const messages = user.messages[messageId];
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.status = status;
      await Muser.findByIdAndUpdate(
        userId,
        { [`messages.${messageId}.${messages.length - 1}.status`]: status },
        { new: true }
      );
      return res.status(200).send("Last message status updated successfully");
    } else {
      return res.status(404).send("No messages found for this sender");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
});
router.post("/deleteChat", async (req, res) => {
  const { userId, messageId } = req.body;
  try {
    // Find the user and clear the messages for the specified messageId
    const updatedUser = await Muser.findOneAndUpdate(
      { _id: userId },
      { $set: { [`messages.${messageId}`]: [] } },
      { new: true } // Return the updated document
    );
    // Check if user was found
    if (!updatedUser) {
      return res.status(404).send("User not found");
    }
    // Check if messages were actually cleared
    if (!updatedUser.messages[messageId]) {
      return res.status(404).send("No messages found for this sender");
    }
    return res.status(200).send("Chat cleared successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
});

router.post("/api/posts", upload.single("media"), async (req, res) => {
 
  const { text, userId } = req.body;
  if (!text || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Text and userId are required" });
  }
  try {
    let mediaUrl = null;
    if (req.file) {
      mediaUrl = await uploadToS3(req.file);
    }
    const newPost = new Post({
      text,
      media: mediaUrl,
      userId,
    });
    const savedPost = await newPost.save();
    res.status(201).json({
      success: true,
      post: savedPost,
    });
  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get a single post with comments and likes
router.get("/getPost/:postId", async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId)
      .populate("userId", "firstName lastName profilePicture")
      .populate("comments.userId", "firstName lastName profilePicture")
      .populate("likes.userId", "firstName lastName profilePicture");
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/postMessage", upload.single("attachment"), async (req, res) => {
  try {
    let mediaUrl = null;
    console.log(req.file, 'req.file')
    if (req.file) {
      mediaUrl = await uploadToS3(req.file);
    }
    const { chatId ,groupId, senderId, receiverId, content } = req.body;
    const attachment = req.file ? req.file.path : null; // Store file path
    const newMessage = new Message({
      chatId,
      groupId,
      senderId,
      receiverId,
      content,
      mediaUrl,
    });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});
// ✅ 2. Get messages from a chat (paginated)
router.get("/getMessages/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ✅ 3. Add a reaction to a message
router.post("/:messageId/reactions", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, emoji } = req.body;
    // Add the reaction to the message
    const message = await Message.findByIdAndUpdate(
      messageId,
      { $push: { reactions: { userId, emoji, reactedAt: new Date() } } },
      { new: true }
    );

    // Check if the message exists
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Populate user data in the reactions
    const populatedMessage = await Message.findById(messageId).populate({
      path: "reactions.userId", // path to the field you want to populate
      model: "User", // The model to populate from (assumes you have a User model)
      select: "firstName ", // Select specific fields you want to return (optional)
    });

    res.status(200).json(populatedMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to add reaction" });
  }
});

// ✅ 4. Delete a message
router.post("/deleteMessage/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findByIdAndDelete(messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

router.post("/updateMsgStatus/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 15 } = req.query; // Default: last 15 messages

    // Find the last `limit` messages sorted by latest first
    const messages = await Messages.find({ chatId })
      .sort({ createdAt: -1 }) // Latest messages first
      .skip((page - 1) * limit) // Pagination
      .limit(limit);
    if (!messages.length) {
      return res.status(404).json({ message: "No messages found" });
    }
    // Extract message IDs
    const messageIds = messages.map((msg) => msg._id);
    // Update status to "read" for the found messages
    await Messages.updateMany(
      { _id: { $in: messageIds } },
      { $set: { status: "read" } }
    );

    res.status(200).json({ message: "Messages updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update messages", details: err.message });
  }
});

module.exports = router;


