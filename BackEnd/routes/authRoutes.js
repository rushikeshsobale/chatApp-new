const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Built-in Node crypto utilities
const Muser = require("../Modules/Muser.js");
const multer = require("multer");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KeysModel = require("../Modules/keysModel.js");
const verifyToken = require("./verifyToken.js");
const { uploadToS3 } = require("../utils/s3Upload");
const sendVerificationEmail = require("../utils/emailService.js");

const secretKey = process.env.JWT_SECRET || "mySecreateKey";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to sign unified JWT tokens across login methods uniformly
const generateUserToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      userName: user.userName,
      requests: user.requests || [],
      friends: user.friends || [],
      followers: user.followers || []
    },
    secretKey,
    { expiresIn: "7d" } // Uniformed execution constraint
  );
};

// Set standard secure cookie options
const cookieOptions = {
  httpOnly: true,
  secure: true, // Always true for cross-origin zero-knowledge persistence
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Passport Google Strategy Configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await Muser.findOne({ googleId: profile.id });

    if (!user) {
      let baseUserName = profile.displayName.replace(/\s+/g, "_").toLowerCase();
      let uniqueUserName = baseUserName;
      let count = 1;
      while (await Muser.findOne({ userName: uniqueUserName })) {
        uniqueUserName = `${baseUserName}_${count++}`;
      }

      user = await Muser.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        userName: uniqueUserName,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        emailVerified: true,
        isGoogleAccount: true
      });
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// --- AUTHENTICATION ROUTES ---

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  async (req, res) => {
    try {
      // Generate standard application context token
      const token = generateUserToken(req.user);

      res.cookie("token", token, cookieOptions);
      res.cookie('logged_in', 'true', { ...cookieOptions, httpOnly: false });

      // Generate the deterministic symmetric seed for crypto
      const serverPepper = process.env.AUTH_PEPPER || "DefaultLocalPepperSecret";
      const symmetricSeed = crypto
        .createHmac("sha256", serverPepper)
        .update(req.user.googleId)
        .digest("hex");

      // 🔹 FIX: Check if this user has finished onboarding
      if (req.user.onboardingComplete) {
        // Old User -> Send straight to auth-success to mount chat keys
        const frontendUrl = `${process.env.FRONTEND_URL}/auth-success`;
        const queryParams = `?auth_status=success&username=${req.user.userName}&seed=${symmetricSeed}`;
        return res.redirect(frontendUrl + queryParams);
      } else {
        // New User -> Redirect them to onboarding first, passing the tracking parameters
        const onboardingUrl = `${process.env.FRONTEND_URL}/onboarding`;
        const queryParams = `?userId=${req.user._id}&username=${req.user.userName}&seed=${symmetricSeed}`;
        return res.redirect(onboardingUrl + queryParams);
      }
    } catch (err) {
      console.error("Google Callback Redirection Engine Error:", err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);
router.get("/getUser", verifyToken, async (req, res) => {
  try {
    console.log(
      "User data fetch request received:",
      req.decoded
    );

    const user = await Muser
      .findById(req.decoded.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        error: "User profile not found",
      });
    }

    res.json(user);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Internal processing error",
    });
  }
});


router.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const { email, password, username, birthdate } = req.body;
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
    // Hash the password cleanly using standard bcrypt layers
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Muser({
      email,
      userName: username,
      password: hashedPassword,
      birthdate,
      emailVerified: true, // Set true for local development bypass loop
      onboardingComplete: false,
    });

    const savedUser = await newUser.save();
    res.status(201).json({
      success: true,
      message: "Registration successful.",
      userId: savedUser._id,
      nextStep: "complete-profile",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Muser
      .findOne({ email })
      .select("+password");
    console.log("Login attempt for email:", email);
    if (!user) {
      return res.status(400).json({
        success: false,
        code: "ACCOUNT_NOT_FOUND",
        message: "Account does not exist.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_NOT_SET",
        message:
          "Please continue with Google login.",
      });
    }

    const validatePassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validatePassword) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message:
          "Invalid email or password.",
      });
    }

    const token =
      generateUserToken(user);

    res.cookie(
      "token",
      token,
      cookieOptions
    );

    res.cookie(
      "logged_in",
      "true",
      {
        ...cookieOptions,
        httpOnly: false,
      }
    );

    let redirectTo = "/home";

    if (user.onboardingComplete) {
      redirectTo =
        `/auth-success` +
        `?auth_status=success` +
        `&username=${user.userName}`;
    }

    return res.status(200).json({
      success: true,
      user,
      redirectTo,
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message:
        "Internal server error",
    });
  }
});

// --- UPDATED SYMMETRIC CRYPTO KEY SYNC ENDPOINTS ---

// Example Backend Route
router.post("/update-public-key", async (req, res) => {
  const { publicKey } = req.body; // The base64 string from your frontend
  const userId = req.user.id; // From your JWT auth

  // Only store the public key string
  await Muser.findByIdAndUpdate(userId, {
    publicKey: publicKey,
    keyRegisteredAt: new Date()
  });

  res.status(200).json({ success: true });
});

router.post('/upload-keys', verifyToken, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const { encryptedMasterKey, salt, iv } = req.body;

    if (!encryptedMasterKey || !salt || !iv) {
      return res.status(400).json({ error: 'Incomplete symmetric payload data provided' });
    }

    // Persist as strings directly to prevent buffer conversion compilation breaks
    const keys = await KeysModel.findOneAndUpdate(
      { userId: userId },
      {
        userId,
        encryptedMasterKey,
        salt,
        iv,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    await Muser.findByIdAndUpdate(userId, { keysId: keys._id });
    res.status(200).json({ message: 'Symmetric backup payload synchronized successfully' });
  } catch (error) {
    console.error('Keys upload error:', error);
    res.status(500).json({ error: 'Internal server error during key payload backup' });
  }
});

router.get('/user-keys', verifyToken, async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const keys = await KeysModel.findOne({ userId });
    if (!keys) {
      return res.status(404).json({ error: 'Symmetric backup data records not found for this profile' });
    }
    res.status(200).json(keys);
  } catch (error) {
    console.error('Failed to fetch user keys:', error);
    res.status(500).json({ error: 'Internal server network processing failure' });
  }
});

// --- ACCOUNT ACCESS MANAGEMENT ---

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await Muser.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User with this email does not exist' });
    }

    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendVerificationEmail(email, resetLink);
    res.status(200).json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/reset-password', verifyToken, async (req, res) => {
  const { newPassword } = req.body;
  try {
    const userId = req.decoded.userId; // Pull directly from safe verified middleware context
    const user = await Muser.findById(userId);

    if (!user) return res.status(404).json({ error: 'User target profile mapping not found' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Password reset execution successful' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.status(401).json({ error: 'Invalid or expired processing session context' });
  }
});

// Clean up endpoint redundancy loops
router.post("/send-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await Muser.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email target already claimed" });
    res.status(201).json({ message: "Verification processing request scheduled", email, nextStep: "verify-email" });
  } catch (error) {
    res.status(500).json({ error: "Internal server handling breakdown" });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    // Verify OTP here
    const isValidCode = true;

    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        message: "Invalid verification code.",
      });
    }

    // Check existing user
    let user = await Muser.findOne({ email });

    // Create temporary onboarding user
    if (!user) {
      user = await Muser.create({
        email,
        emailVerified: true,
        onboardingComplete: false,
        authProvider: "email",
      });
    }

    // Generate auth token
    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Cookies
    res.cookie(
      "token",
      token,
      cookieOptions
    );

    res.cookie(
      "logged_in",
      "true",
      {
        ...cookieOptions,
        httpOnly: false,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully.",
      redirectTo: "/onboarding",
      userId: user._id,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message:
        "Verification failed.",
    });
  }
});
// Make sure your JWT generator is available


router.put(
  "/complete-profile",
  verifyToken,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const userId = req.decoded.userId;

      console.log("reqbody", req.body);

      const user = await Muser.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          code: "ACCOUNT_NOT_FOUND",
          message: "Account does not exist. Please sign up.",
        });
      }

      let profilePicture = user.profilePicture;

      // Upload profile picture
      if (req.file) {


        const uploadResult = await uploadToS3(req.file, {
          folder: "profiles",
          checkDuplicate: false,
          generateUniqueName: true,
        });

        profilePicture = uploadResult.url;
      }

      // Parse profile data safely
      let profileData = {};

      if (req.body.profileData) {
        try {
          profileData = JSON.parse(req.body.profileData);
        } catch (err) {
          console.log("Profile data parse error:", err);
        }
      }

      const userName = req.body.userName || user.userName;

      const bio =
        req.body.bio ||
        profileData?.onboarding?.bio ||
        "";

      const preferences =
        profileData?.onboarding?.preferences || {};

      const publicKey = req.body.publicKey || user.publicKey;
      const updateData = {
        userName,
        profilePicture,
        bio,
        preferences,
        publicKey,
        onboardingComplete: true,
        lastUpdated: new Date(),
      };

      // Password
      if (
        req.body.password &&
        req.body.password.trim() !== ""
      ) {
        const salt = await bcrypt.genSalt(10);

        updateData.password = await bcrypt.hash(
          req.body.password.trim(),
          salt
        );

        updateData.isPasswordSet = true;
      }

      // Basic info
      if (profileData.basicInfo) {
        const {
          firstName,
          lastName,
          gender,
          birthDate,
          location,
        } = profileData.basicInfo;

        Object.assign(updateData, {
          firstName,
          lastName,
          gender,
          birthDate,
          location,
        });
      }

      // Onboarding
      if (profileData.onboarding) {
        const { interests, goals } =
          profileData.onboarding;

        Object.assign(updateData, {
          interests: interests || [],
          goals: goals || [],
          preferences: {
            ...preferences,
            ...profileData.onboarding.preferences,
          },
        });
      }

      // Update user
      const updatedUser =
        await Muser.findByIdAndUpdate(
          userId,
          {
            $set: updateData,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      // Generate token
      const token = jwt.sign(
        { userId: updatedUser._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };

      res.cookie("token", token, cookieOptions);

      res.cookie("logged_in", "true", {
        ...cookieOptions,
        httpOnly: false,
      });

      // Seed
      const serverPepper =
        process.env.AUTH_PEPPER ||
        "DefaultLocalPepperSecret";

      const seedSourceId =
        updatedUser.googleId ||
        updatedUser._id.toString();

      const symmetricSeed = crypto
        .createHmac("sha256", serverPepper)
        .update(seedSourceId)
        .digest("hex");

      const redirectUrl =
        `/auth-success?auth_status=success` +
        `&username=${updatedUser.userName}` +
        `&seed=${symmetricSeed}`;

      return res.status(200).json({
        success: true,
        message:
          "Profile onboarding workflow finished successfully",
        user: updatedUser,
        redirectTo: redirectUrl,
      });
    } catch (error) {
      console.error(
        "Profile completion route exception:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Internal profile mapping exception",
      });
    }
  }
);

router.patch("/public-key", verifyToken, async (req, res) => {
  console.log("Received request to update public key");
  const { publicKey } = req.body;
  try {

    await Muser.findByIdAndUpdate(req.decoded.userId, {
      publicKey,
    });

    return res.status(200).json({
      success: true,
      message:
        "keyupload successful",

    });

  }
  catch (error) {
    console.error(
      "Profile completion route exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Internal profile mapping exception",
    });
  }

});


module.exports = router;