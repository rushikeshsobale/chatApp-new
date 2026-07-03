const express = require('express');
require('dotenv').config();
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const signMediaResponse = require("./middleware/signMediaResponse");

const app = express();
// CORS Configuration
app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://hibuddy-opal.vercel.app"
  ],
  credentials: true
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.set("trust proxy", 1);
app.use(express.json());
// Turns stored media keys / legacy urls in every JSON response into
// fresh pre-signed S3 urls (see BackEnd/utils/s3Upload.js signDeep).
app.use(signMediaResponse);

// so Google strategy is loaded

// MongoDB Connection
require("./Mongo/Conn.js")
// API Routes
const router = require('./routes/router.js');
const authRoutes = require("./routes/authRoutes.js");
const profileRoutes = require("./routes/profileRoutes.js"); 
const postRoutes = require("./routes/postRoutes.js");
const storyRoutes = require("./routes/storyRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");
const messageRoutes = require("./routes/messageRoutes.js");
const relationships = require("./routes/relationships.js")
const passport = require('passport');
const conversationRoutes = require("./routes/conversationRoutes.js");   
const userRoutes = require("./routes/userRoutes.js");
 app.use(passport.initialize());
 app.use( router);
 app.use("/auth", authRoutes);
 app.use("/profile", profileRoutes);
 app.use("/post", postRoutes);
 app.use("/stories", storyRoutes);
 app.use("/notifications", notificationRoutes);
 app.use("/messages", messageRoutes);
 app.use("/relationships", relationships);
 app.use("/conversations", conversationRoutes);
  app.use("/users", userRoutes);
module.exports = app;
