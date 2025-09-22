const express = require('express');
require('dotenv').config();
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
// CORS Configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true,
};
app.use(cors(corsOptions));
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
const passport = require('passport');
 app.use("/api", router);
 app.use("/api/auth", authRoutes);
 app.use("/api/profile", profileRoutes);
 app.use("/api/post", postRoutes);
 app.use("/api/stories", storyRoutes);
 app.use("/api/notifications", notificationRoutes);
 app.use("/api/messages", messageRoutes);
 app.use("/api/group", groupRoutes);
 app.use(passport.initialize());
module.exports = app;
