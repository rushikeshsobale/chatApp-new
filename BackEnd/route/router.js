// router.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');

const multer = require('multer');
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Muser = require("../Modules/Muser.js");
const Post = require('../Modules/Post.js');
const cookieParser = require("cookie-parser");
const verifyToken = require('./verifyToken'); // Import the JWT middleware
const secretKey = process.env.JWT_SECRET || "mySecreateKey";
router.use(cookieParser());
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
     accessKeyId: ACCESS_KEY_ID,
     secretAccessKey: SECRET_ACCESS_KEY,
  },
});
const upload = multer({ storage: multer.memoryStorage() });
 

router.get("/", (req, res) => {
  res.send("Alright");
});


router.get("/getUsers", verifyToken, async (req, res) => {
  try {
    const users = await Muser.find(); // Retrieve all users
    const filteredUsers = users.filter(user => user._id.toString() !== req.decoded.userId);

    res.json(filteredUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/getUser", verifyToken, async (req, res) => {
  try {
    const user = await Muser.findById(req.decoded.userId)
      .populate({
        path: 'friends.friendId',  // Populate the friendId field within friends array
        select: 'firstName lastName email profilePicture' // Specify fields to include for each friend
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

router.get("/getProfileUser/:userId", verifyToken, async (req, res) => {
  const {userId} = req.params
  console.log(req.params,'params')
  try {
    const objectId = new mongoose.Types.ObjectId(userId);
   
    const user = await Muser.findById(objectId)
      .populate({
        path: 'friends.friendId',  // Populate the friendId field within friends array
        select: 'firstName lastName email profilePicture' // Specify fields to include for each friend
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
router.post("/register", upload.single('profilePicture'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, birthdate, phone } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store the profile picture URL (if uploaded)
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

    const newUser = new Muser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      birthdate,
      phone,
      profilePicture, // Save the profile picture path
      requests: [],
    });

    // Save the user to the database
    const savedUser = await newUser.save();

    res.status(201).json(savedUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });s
  }
});
router.put('/api/updateUser/:userId', upload.single('profilePicture'), async (req, res) => {
  const { firstName, lastName, bio } = req.body;
  const { userId } = req.params;
  if (!userId || !firstName || !lastName) {
    return res.status(400).json({ success: false, message: 'User ID, First Name, and Last Name are required' });
  }
  try {
    let mediaUrl = null; // Default to null if no media file is uploaded
    if (req.file) {
      mediaUrl = await uploadToS3(req.file);
     
    }

    // Prepare data for user update
    const updatedData = {
      firstName,
      lastName,
      bio,
      profilePicture: mediaUrl || null, // Use media URL if available
    };
    const updatedUser = await Muser.findByIdAndUpdate(userId, updatedData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;


  try {
    const validateEmail = await Muser.findOne({ email: email });
    if (validateEmail) {
      const validatePassword = await bcrypt.compare(
        password,
        validateEmail.password
      );

      if (validatePassword) {
        const token = jwt.sign(
          { userId: validateEmail._id, email: validateEmail.email, name: validateEmail.firstName, requests: validateEmail.requests, friends: validateEmail.friends },
          secretKey,
          { expiresIn: "3560d" }
        );
        res.cookie("token", token, { httpOnly: true, sameSite: "strict" });

        res.status(200).json({ message: "Successfully logged in", token });


      } else {
        res.status(400).send("Password does not match");
      }
    }
    else {
      res.status(400).send("user with this account does not exist.")
    }
  }
  catch (error) {
    console.log("something went wrong for login")
  }
});

router.post("/sendRequest/:receiverId", verifyToken, async (req, res) => {
  try {
    const senderId = req.decoded.userId;
    const senderName = req.decoded.name;
    const receiverId = req.params.receiverId;
    const receiver = await Muser.findById(receiverId);
    const sender = await Muser.findById(senderId);
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }
    const alreadyFriends = sender.friends.find(friend => friend.friendId === receiverId);
    if (alreadyFriends) {
      return res.status(400).json({ message: 'You are already friends' });
    }

    await Muser.findByIdAndUpdate(senderId, {
      $push: {
        friends: {
          friendId: receiverId,
          friendName: receiver.firstName,
          isFriend: 'sent',

        }
      }
    });
    await Muser.findByIdAndUpdate(receiverId, {
      $push: {
        friends: {
          friendId: senderId,
          friendName: sender.firstName,
          isFriend: 'recieved',

        }
      }
    });

    res.status(200).json({ message: 'Request sent successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




router.post("/acceptFriendRequest/:requesterId", verifyToken, async (req, res) => {
  try {
    const userId = req.decoded.userId; // The user accepting the request
    const requesterId = req.params.requesterId; // The user who sent the request
   
    // Find both users
    const user = await Muser.findById(userId);
    const requester = await Muser.findById(requesterId);

    if (!user || !requester) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingRequestIndex = user.friends.findIndex(request => request.friendId === requesterId);
    if (existingRequestIndex === -1) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }
    await Muser.findByIdAndUpdate(userId, {
      $set: {
        "friends.$[elem].isFriend": 'friends' // Update isFriend to true for the requester
      }
    }, {
      arrayFilters: [{ "elem.friendId": requesterId }], // Match the requester in the friends array
      new: true
    });

    await Muser.findByIdAndUpdate(requesterId, {
      $set: {
        "friends.$[elem].isFriend": 'friends' // Update isFriend to true for the user
      }
    }, {
      arrayFilters: [{ "elem.friendId": userId }], // Match the user in the friends array
      new: true
    });

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/sendMessage', async (req, res) => {
  const { sendId, message } = req.body;
  const receiverId = sendId; // Extract only the _id field from sendId
  const { text, senderId, senderName, status } = message;
  console.log(receiverId, req.body)
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

      res.status(200).json({ message: 'Message sent!' });
    } else {
      res.status(404).json({ message: 'User not found.' });
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
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if there is a pending friend request from the requester
    const existingRequestIndex = user.friendRequests.findIndex(request => request.senderId.toString() === requesterId);
    if (existingRequestIndex === -1) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }
    user.friendRequests.splice(existingRequestIndex, 1);
    await Muser.findByIdAndUpdate(userId, { friendRequests: user.friendRequests }, { new: true });
    res.status(200).json({ message: 'Friend request deleted successfully', user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/:userId/messages', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await Muser.findById(userId).select('messages');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get('/getMessages/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await Muser.findById(userId);

    if (user) {
      res.status(200).json(user.messages || {});
    } else {
      res.status(404).json({ message: 'User not found.' });
    }
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post('/updateMessageStatus', async (req, res) => {
  const { userId, messageId, status } = req.body;
  try {
      const user = await Muser.findById(userId);
      if (!user) {
          return res.status(404).send('User not found');
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
          return res.status(200).send('Last message status updated successfully');
      } else {
          return res.status(404).send('No messages found for this sender');
      }
  } catch (error) {
      console.error(error);
      return res.status(500).send('Server error');
  }
});
router.post('/deleteChat', async (req, res) => {
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
          return res.status(404).send('User not found');
      }

      // Check if messages were actually cleared
      if (!updatedUser.messages[messageId]) {
          return res.status(404).send('No messages found for this sender');
      }

      return res.status(200).send('Chat cleared successfully');
  } catch (error) {
      console.error(error);
      return res.status(500).send('Server error');
  }
});


const uploadToS3 = async (file) => {

  const encodedFileName = encodeURIComponent(file.originalname);
  const mediaUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${Date.now()}-${encodedFileName}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,  // Use environment variable here for consistency
    Key: `uploads/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',  // Ensure the file is publicly readable
  };

  try {
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    return mediaUrl;  // Return the generated media URL
  } catch (err) {
    console.error('Error uploading to S3:', err);
    throw err;  // Ensure the error is thrown if the upload fails
  }
};


router.post('/api/posts', upload.single('media'), async (req, res) => {
  const { text, userId } = req.body;
 
  if (!text || !userId) {
    return res.status(400).json({ success: false, message: 'Text and userId are required' });
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
    console.error('Error saving post:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Get all posts by a specific userId
router.get('/api/posts/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Find posts by userId
    const posts = await Post.find({ userId });

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No posts found for this user',
      });
    }

    // Return the posts
    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Add a comment to a post
router.post('/api/posts/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body;

  if (!text || !userId) {
    return res.status(400).json({ success: false, message: 'Text and userId are required' });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.comments.push({ userId, text });
    await post.save();

    res.status(201).json({ success: true, comments: post.comments });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Like a post
router.post('/api/likePost/:postId', async (req, res) => {
  const { postId } = req.params;
  const {userId} = req.body;
 
   console.log(userId, 'reqbody')
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if the user has already liked the post
    const alreadyLiked = post.likes.some((like) => like.userId.toString() === userId);
    if (alreadyLiked) {
      return res.status(400).json({ success: false, message: 'User already liked this post' });
    }

    post.likes.push({ userId });
    await post.save();

    res.status(201).json({ success: true, likes: post.likes });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get a single post with comments and likes
router.get('/api/getPost/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId)
  .populate('comments.userId', 'firstName lastName profilePicture')
  .populate('likes.userId', 'firstName lastName profilePicture');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
   console.log(post, 'Post')
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



module.exports = router;