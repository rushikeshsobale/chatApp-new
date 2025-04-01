const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Muser = require("../Modules/Muser.js");
const multer = require("multer");
const secretKey = process.env.JWT_SECRET || "mySecreateKey";
const router = express.Router();

// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// Register route
router.post("/register", upload.single("profilePicture"), async (req, res) => {
  console.log("Received request:", req.body);
  try {
    const { email, password, username, birthdate, phone } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        error: "Email, password, and username are required.",
      });
    }
    const existingUser = await Muser.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email already exists.",
      });
    }
    const newUser = new Muser({
      email,
      userName: username,
      password,
      birthdate,
      phone,
      onboardingComplete: false,
    });
    const savedUser = await newUser.save();
    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      userId: savedUser._id,
      nextStep: "verify-email",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Send verification email
router.post("/send-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await Muser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }
    res.status(201).json({
      message: "Please verify your email.",
      email: email,
      nextStep: "verify-email",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Email verification route
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    const isValid = true; // Mock for development
    if (!isValid) {
      return res.status(400).json({ error: "Invalid verification code" });
    }
    await Muser.findOneAndUpdate({ email }, { emailVerified: true });
    res.json({
      message: "Email verified successfully",
      nextStep: "complete-profile",
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Complete profile route
router.put("/complete-profile/:userId", upload.single("profilePicture"), async (req, res) => {
  const userId = req.params.userId;
  try {
    console.log(req.body, "request body");
    const profileData = req.body.profileData ? JSON.parse(req.body.profileData) : {};
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

    const updateData = {
      ...profileData,
      profilePicture,
      onboardingComplete: true,
      lastUpdated: new Date(),
    };

    if (profileData.basicInfo) {
      updateData.firstName = profileData.basicInfo.firstName;
      updateData.lastName = profileData.basicInfo.lastName;
      updateData.gender = profileData.basicInfo.gender;
      updateData.birthDate = profileData.basicInfo.birthDate;
      updateData.location = profileData.basicInfo.location;
    }

    const updatedUser = await Muser.findByIdAndUpdate(userId, { $set: updateData }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile completed successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile completion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const validateEmail = await Muser.findOne({ email: email });
    console.log("Stored Password:", validateEmail.password);
    console.log("Entered Password:", password);
    console.log(
      "Stored:",
      validateEmail.password,
      typeof validateEmail.password
    );
    if (validateEmail) {
      const validatePassword = await bcrypt.compare(
        password,
        validateEmail.password
      );
    if (validatePassword) {
      const token = jwt.sign(
        {
          userId: validateEmail._id,
          email: validateEmail.email,
          name: validateEmail.userName,
          requests: validateEmail.requests,
          friends: validateEmail.friends,
        },
        secretKey,
        { expiresIn: "3560d" }
      );
      res.cookie("token", token, { httpOnly: true, sameSite: "strict" });
      res.status(200).json({ message: "Successfully logged in", token });
    } else {
      res.status(400).json({ message: "Password does not match" });
    }
  }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});