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
// MongoDB Connection
require("./Mongo/Conn.js")
// API Routes
const router = require('./routes/router.js');
const authRoutes = require("./routes/authRoutes.js");
const profileRoutes = require("./routes/profileRoutes.js"); 
app.use(router);
app.use("/profile", profileRoutes);
app.use("/auth", authRoutes);

module.exports = app;
