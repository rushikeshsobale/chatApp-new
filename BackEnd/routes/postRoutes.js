// router.js
require("dotenv").config();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const router = express.Router();
const crypto = require("crypto");
const Media = require("../Modules/Media.js");
const Post = require("../Modules/Post.js");
const { uploadToS3 } = require("../utils/s3Upload");

const upload = multer({ storage: multer.memoryStorage() });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

router.post("/mediaPost", upload.single("media"), async (req, res) => {
  const { text, userId } = req.body;
  
  if (!text || !userId) {
    return res.status(400).json({
      success: false,
      message: "Text and userId are required",
    });
  }

  try {
    let mediaUrl = null;
   
    if (req.file) {
      const uploadResult = await uploadToS3(req.file, {
        folder: "posts",
        checkDuplicate: true
      });
      mediaUrl = uploadResult.url;
    }

    const newPost = new Post({
      text,
      media: mediaUrl,
      userId,
    });

    const savedPost = await newPost.save();

    return res.status(201).json({
      success: true,
      post: savedPost,
    });

  } catch (error) {
    console.error("Error saving post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get all posts by a specific userId
router.get("/getPosts/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    // Find posts by userId
    const posts = await Post.find({ userId })
      .populate("userId", "userName profilePicture")
      .populate("comments.userId", "userName profilePicture")
      .populate("likes.userId", "userName profilePicture");
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No posts found for this user",
      });
    }
    // Return the posts
    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Add a comment to a post
router.post("/posts/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body;
  if (!text || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Text and userId are required" });
  }
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    post.comments.push({ userId, text });
    await post.save();
    res.status(201).json({ success: true, comments: post.comments });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Like a post
router.post("/likePost/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "userId is required" });
  }
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    // Check if the user has already liked the post
    const alreadyLiked = post.likes.some(
      (like) => like.userId.toString() === userId
    );
    if (alreadyLiked) {
      return res
        .status(400)
        .json({ success: false, message: "User already liked this post" });
    }
    post.likes.push({ userId });
    await post.save();
    res.status(201).json({ success: true, likes: post.likes });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get a single post with comments and likes
router.get("/getPost/:postId", async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId)
      .populate("userId", "userName profilePicture")
      .populate("comments.userId", "userName profilePicture")
      .populate("likes.userId", "userName profilePicture");
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

router.get("/getPosts", async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default to page 1 and 10 posts per page
  try {
    const posts = await Post.find()
      .skip((page - 1) * limit) // Skip (page - 1) * limit posts
      .limit(parseInt(limit)) // Limit the number of posts
      .populate("userId", "userName profilePicture") // Populate the user who posted the post
      .populate("comments.userId", "userName profilePicture") // Populate user info for comments
      .populate("likes.userId", "userName profilePicture"); // Populate user info for likes
    if (!posts || posts.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No posts found" });
    }
    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Save a post
router.post("/savePost/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      message: "userId is required" 
    });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found" 
      });
    }

    // Check if the user has already saved the post
    const alreadySaved = post.savedBy.includes(userId);
    if (alreadySaved) {
      return res.status(400).json({ 
        success: false, 
        message: "Post already saved" 
      });
    }

    post.savedBy.push(userId);
    await post.save();

    res.status(200).json({ 
      success: true, 
      message: "Post saved successfully",
      savedBy: post.savedBy 
    });
  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

// Unsave a post
router.post("/unsavePost/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      message: "userId is required" 
    });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found" 
      });
    }

    // Check if the user has saved the post
    const isSaved = post.savedBy.includes(userId);
    if (!isSaved) {
      return res.status(400).json({ 
        success: false, 
        message: "Post not saved" 
      });
    }

    post.savedBy = post.savedBy.filter(id => id.toString() !== userId);
    await post.save();

    res.status(200).json({ 
      success: true, 
      message: "Post unsaved successfully",
      savedBy: post.savedBy 
    });
  } catch (error) {
    console.error("Error unsaving post:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

// Get saved posts for a user
router.get("/savedPosts/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const savedPosts = await Post.find({ savedBy: userId })
      .populate("userId", "userName profilePicture")
      .populate("comments.userId", "userName profilePicture")
      .populate("likes.userId", "userName profilePicture");

    res.status(200).json({ 
      success: true, 
      posts: savedPosts 
    });
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

module.exports = router;
