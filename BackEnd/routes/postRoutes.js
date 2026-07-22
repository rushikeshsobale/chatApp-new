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
const Relationship = require("../Modules/relationships.js");
const { uploadToS3, deleteFromS3 } = require("../utils/s3Upload");
const { checkImageModeration } = require("../utils/moderation");
const { notify } = require("../utils/notify");
const verifyToken = require("./verifyToken.js");
const upload = multer({ storage: multer.memoryStorage() });
router.post("/mediaPost", verifyToken, upload.single("media"), async (req, res) => {
  const { text } = req.body;
  // userId is always the authenticated caller — trusting a body-supplied
  // userId would let anyone create posts attributed to anyone else.
  const userId = req.decoded.userId;
  try {
    let mediaKey = null;
    let mediaType = 'image';
    if (req.file) {
      if (req.file.mimetype.startsWith('image/')) {
        const { flagged } = await checkImageModeration(req.file.buffer);
        if (flagged) {
          return res.status(422).json({
            success: false,
            code: "CONTENT_FLAGGED",
            message: "This image appears to violate our content guidelines and can't be posted.",
          });
        }
      }

      const uploadResult = await uploadToS3(req.file, {
          folder: "profiles",
        checkDuplicate: true
      });
      mediaKey = uploadResult.key;
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }
    const newPost = new Post({
      text,
      media: mediaKey,
      mediaType,
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
const mongoose = require('mongoose');

router.get("/getPosts/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId === "undefined" || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid User ID format.",
    });
  }

  try {
    const posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .populate("userId", "userName profilePicture")
      .populate("comments.userId", "userName profilePicture")
      .populate("likes.userId", "userName profilePicture");

    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Home feed: caller's own posts + posts by users they follow, newest first
const FEED_PAGE_SIZE = 20;

router.get("/feed", verifyToken, async (req, res) => {
  const userId = req.decoded.userId;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  try {
    const following = await Relationship.find({
      requester: userId,
      type: "follow",
      status: "accepted",
    }).select("recipient");

    const authorIds = [userId, ...following.map((f) => f.recipient)];

    const posts = await Post.find({ userId: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * FEED_PAGE_SIZE)
      .limit(FEED_PAGE_SIZE)
      .populate("userId", "userName profilePicture")
      .populate("comments.userId", "userName profilePicture")
      .populate("likes.userId", "userName profilePicture");

    res.status(200).json({ success: true, posts, page, limit: FEED_PAGE_SIZE });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Posts related to a given post: other posts by the same author first,
// then the rest of the caller's own+following feed, newest first.
router.get("/related/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.decoded.userId;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ success: false, message: "Invalid post id" });
  }

  try {
    const basePost = await Post.findById(postId).select("userId");
    if (!basePost) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const following = await Relationship.find({
      requester: userId,
      type: "follow",
      status: "accepted",
    }).select("recipient");
    const feedAuthorIds = [userId, ...following.map((f) => f.recipient)];

    const populateOpts = (query) =>
      query
        .populate("userId", "userName profilePicture")
        .populate("comments.userId", "userName profilePicture")
        .populate("likes.userId", "userName profilePicture");

    const sameAuthorPosts = await populateOpts(
      Post.find({ _id: { $ne: postId }, userId: basePost.userId }).sort({ createdAt: -1 }).limit(100)
    );

    const excludeIds = [postId, ...sameAuthorPosts.map((p) => p._id)];
    const feedPosts = await populateOpts(
      Post.find({ _id: { $nin: excludeIds }, userId: { $in: feedAuthorIds } }).sort({ createdAt: -1 }).limit(100)
    );

    const combined = [...sameAuthorPosts, ...feedPosts];
    const start = (page - 1) * FEED_PAGE_SIZE;
    const posts = combined.slice(start, start + FEED_PAGE_SIZE);

    res.status(200).json({ success: true, posts, page, limit: FEED_PAGE_SIZE, total: combined.length });
  } catch (error) {
    console.error("Error fetching related posts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/:postId/comments", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const { commentText } = req.body;
  const userId = req.decoded.userId;

  if (!commentText || !userId) {
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

    // Push the new comment
    const newComment = { userId, text: commentText };
    post.comments.push(newComment);
    await post.save();

    // Populate only the newly added comment
    const populatedComment = await Post.findOne(
      { _id: postId, "comments._id": post.comments[post.comments.length - 1]._id },
      { "comments.$": 1 } // fetch only the last comment
    )
      .populate({
        path: "comments.userId",
        select: "_id userName profilePicture"
      })
      .exec();

    res.status(201).json({
      success: true,
      comment: populatedComment.comments[0]
    });

    notify(req.app.get('io'), {
      recipient: post.userId,
      sender: userId,
      type: 'comment',
      post: postId,
      verb: `commented on your post: "${commentText}"`,
    }).catch((err) => console.error('Error notifying comment:', err));

  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});



// Like a post
router.post("/likePost/:postId", verifyToken,  async (req, res) => {
  const { postId } = req.params;
  const userId = req.decoded.userId;
  console.log('=== LIKE DEBUG ===');
  console.log('req.params:', req.params);
  console.log('req.body:', req.body);
  console.log('userId:', userId);
  console.log('===================');
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

    notify(req.app.get('io'), {
      recipient: post.userId,
      sender: userId,
      type: 'like',
      post: postId,
      verb: 'liked your post',
    }).catch((err) => console.error('Error notifying like:', err));
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Unlike a post
router.post("/unlikePost/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.decoded.userId;
  console.log('=== UNLIKE DEBUG ===');
  console.log('req.params:', req.params);
  console.log('req.body:', req.body);
  console.log('userId:', userId);
  console.log('===================');
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
    // Check if the user has liked the post
    const hasLiked = post.likes.some(
      (like) => like.userId.toString() === userId
    );
    if (!hasLiked) {
      return res
        .status(400)
        .json({ success: false, message: "User has not liked this post" });
    }
    // Remove the like
    post.likes = post.likes.filter(
      (like) => like.userId.toString() !== userId
    );
    await post.save();
    res.status(200).json({ success: true, likes: post.likes });
  } catch (error) {
    console.error("Error unliking post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Delete a comment from a post
router.delete("/:postId/comments/:commentId", verifyToken, async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.decoded.userId;
  
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
    
    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }
    
    // Check if the user is the comment author or post author
    const isCommentAuthor = comment.userId.toString() === userId;
    const isPostAuthor = post.userId.toString() === userId;
    
    if (!isCommentAuthor && !isPostAuthor) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete this comment" });
    }
    
    // Remove the comment
    post.comments = post.comments.filter(
      (comment) => comment._id.toString() !== commentId
    );
    await post.save();
    
    res.status(200).json({ 
      success: true, 
      message: "Comment deleted successfully",
      comments: post.comments 
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get a single post with comments and likes
router.get("/:postId/getPostById", async (req, res) => {
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

// Edit a post's caption (media is not editable after publish)
router.put("/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;
  const userId = req.decoded.userId;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this post" });
    }

    post.text = text;
    await post.save();

    const updated = await Post.findById(postId)
      .populate("userId", "userName profilePicture")
      .populate("comments.userId", "userName profilePicture")
      .populate("likes.userId", "userName profilePicture");

    res.status(200).json({ success: true, post: updated });
  } catch (error) {
    console.error("Error editing post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Delete a post (and its S3 media, if any)
router.delete("/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.decoded.userId;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this post" });
    }

    if (post.media) {
      await deleteFromS3(post.media).catch((error) => {
        console.error("Error deleting post media from S3:", error);
      });
    }
    await post.deleteOne();

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
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
router.post("/savePost/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.decoded.userId;
  
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
    router.post("/unsavePost/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.decoded.userId;
  
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
router.get("/:userId/savedPosts", verifyToken,  async (req, res) => {
  const { userId } = req.params;

  if (userId !== req.decoded.userId) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this user's saved posts"
    });
  }

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

module.exports = router