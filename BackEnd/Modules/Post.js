// models/Post.js
const mongoose = require('mongoose');

// Define the schema for comments
const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Refers to the user who made the comment
    required: true,
    ref: 'Muser', // Assuming there's a User model
  },
  text: {
    type: String,
    // required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Define the schema for likes
const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Refers to the user who liked the post
    required: true,
    ref: 'Muser',
  },
});

const postSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  media: {
    type: String,
    required: false,
  },
  hash: { type: String, required: false },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Muser',
  },
  comments: [commentSchema], // Array of comments
  likes: [likeSchema], // Array of likes
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Muser'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
