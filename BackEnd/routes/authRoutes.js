const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Muser = require("../Modules/Muser.js");
const multer = require("multer");
const secretKey = process.env.JWT_SECRET || "mySecreateKey";
const router = express.Router();
const { uploadToS3 } = require("../utils/s3Upload");
// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });
// Register route
router.post("/register", upload.single("profilePicture"), async (req, res) => {
  
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
  
  // Set a longer timeout for this route
  req.setTimeout(60000); // 60 seconds timeout
  
  try {
    // Validate user exists
    const user = await Muser.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found",
        message: "The user with the provided ID does not exist"
      });
    }

    // Handle profile picture upload
    let profilePicture = user.profilePicture; // Keep existing picture by default
    if (req.file) {
      try {
        const uploadResult = await uploadToS3(req.file, {
          folder: "profiles",
          checkDuplicate: false,
          generateUniqueName: true
        });
        profilePicture = uploadResult.url;
      } catch (uploadError) {
        console.error("Profile picture upload error:", uploadError);
        return res.status(500).json({
          success: false,
          error: "Profile picture upload failed",
          message: "Failed to upload profile picture",
          details: uploadError.message
        });
      }
    }

    // Parse and validate profile data
    let profileData;
    try {
      profileData = req.body.profileData ? JSON.parse(req.body.profileData) : {};
    } catch (error) {
      console.error("Profile data parsing error:", error);
      return res.status(400).json({
        success: false,
        error: "Invalid profile data format",
        message: "The profile data provided is not in the correct format",
        details: error.message
      });
    }

    // Prepare update data
    const updateData = {
      profilePicture,
      onboardingComplete: true,
      lastUpdated: new Date()
    };

    // Handle basic info
    if (profileData.basicInfo) {
      const { firstName, lastName, gender, birthDate, location } = profileData.basicInfo;
      
      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "First name and last name are required",
          missingFields: {
            firstName: !firstName,
            lastName: !lastName
          }
        });
      }

      updateData.firstName = firstName;
      updateData.lastName = lastName;
      updateData.gender = gender;
      updateData.birthDate = birthDate;
      updateData.location = location;
    }

    // Handle onboarding data
    if (profileData.onboarding) {
      const { interests, preferences, goals, bio } = profileData.onboarding;
      
      updateData.interests = interests || [];
      updateData.preferences = preferences || {};
      updateData.goals = goals || [];
      updateData.bio = bio || '';
    }

    // Handle additional profile data
    if (profileData.additionalInfo) {
      updateData.additionalInfo = profileData.additionalInfo;
    }

    // Update user profile with retry logic
    let updatedUser;
    try {
      updatedUser = await Muser.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } catch (updateError) {
      console.error("Profile update error:", updateError);
      return res.status(500).json({
        success: false,
        error: "Profile update failed",
        message: "Failed to update user profile",
        details: updateError.message
      });
    }

    // Prepare response data
    const responseData = {
      success: true,
      message: "Profile completed successfully",
      data: {
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          userName: updatedUser.userName,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          profilePicture: updatedUser.profilePicture,
          onboardingComplete: updatedUser.onboardingComplete,
          interests: updatedUser.interests,
          goals: updatedUser.goals,
          bio: updatedUser.bio,
          lastUpdated: updatedUser.lastUpdated
        },
        nextStep: "profile-completed"
      }
    };

    // Send response with proper headers
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(responseData);

  } catch (error) {
    console.error("Profile completion error:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: "An error occurred while updating the profile",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});



router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const validateEmail = await Muser.findOne({ email: email });
    if (!validateEmail) {
      return res.status(400).json({ message: "User not found" });
    }

    const validatePassword = await bcrypt.compare(
      password,
      validateEmail.password
    );
   
    if (validatePassword) {
      const token = jwt.sign(
        {
          userId: validateEmail._id,
          email: validateEmail.email,
          userName: validateEmail.userName,
          requests: validateEmail.requests,
          friends: validateEmail.friends,
          followers:validateEmail.followers
        },
        secretKey,
        { expiresIn: "3560d" }
      );
      res.cookie("token", token, { httpOnly: true, sameSite: "strict" });
      res.status(200).json({ message: "Successfully logged in", token });
    } else {
      res.status(400).json({ message: "Password does not match" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;