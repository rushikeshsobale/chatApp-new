const express = require('express');
require('dotenv').config();
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
app.use(cookieParser());
const app = express();
// CORS Configuration
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
app.use(express.json());

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
const groupRoutes = require("./routes/groupRoutes.js")
const relationships = require("./routes/relationships.js")
const passport = require('passport');
const conversationRoutes = require("./routes/conversationRoutes.js");   
const userRoutes = require("./routes/userRoutes.js");
 app.use( router);
 app.use("/auth", authRoutes);
 app.use("/profile", profileRoutes);
 app.use("/post", postRoutes);
 app.use("/stories", storyRoutes);
 app.use("/notifications", notificationRoutes);
 app.use("/messages", messageRoutes);
 app.use("/group", groupRoutes);
 app.use("/relationships", relationships);
 app.use("/conversations", conversationRoutes);
  app.use("/users", userRoutes);
 app.use(passport.initialize());
module.exports = app;
