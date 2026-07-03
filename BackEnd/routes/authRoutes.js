const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Built-in Node crypto utilities
const Muser = require("../Modules/Muser.js");
const multer = require("multer");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
      const email = profile.emails[0].value;
      user = await Muser.findOne({ email });

      if (user) {
        // Existing manually-registered account — link Google login to it
        user.googleId = profile.id;
        user.isGoogleAccount = true;
        user.emailVerified = true;
        await user.save();
      } else {
        let baseUserName = profile.displayName.replace(/\s+/g, "_").toLowerCase();
        let uniqueUserName = baseUserName;
        let count = 1;
        while (await Muser.findOne({ userName: uniqueUserName })) {
          uniqueUserName = `${baseUserName}_${count++}`;
        }

        user = await Muser.create({
          googleId: profile.id,
          email,
          userName: uniqueUserName,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          emailVerified: true,
          isGoogleAccount: true
        });
      }
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

      // 🔹 FIX: Check if this user has finished onboarding
      if (req.user.onboardingComplete) {
        // Old User -> Send straight to auth-success to mount chat keys
        const frontendUrl = `${process.env.FRONTEND_URL}/auth-success`;
        const queryParams = `?auth_status=success&userId=${req.user._id}&username=${req.user.userName}`;
        return res.redirect(frontendUrl + queryParams);
      } else {
        // New User -> Redirect them to onboarding first, passing the tracking parameters
        const onboardingUrl = `${process.env.FRONTEND_URL}/onboarding`;
        const queryParams = `?userId=${req.user._id}&username=${req.user.userName}`;
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
        success: false,
        code: "ACCOUNT_NOT_FOUND",
        message: "User not found.",
      });
    }

    res.json(user);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    });
  }
});


router.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const { email, password, username, birthdate } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        code: "MISSING_FIELDS",
        message: "Email, password, and username are required.",
      });
    }
    const existingUser = await Muser.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists.",
      });
    }
    // Muser's pre('save') hook already hashes `password` whenever it's
    // modified — hashing it here too would double-hash it, which makes
    // bcrypt.compare() at login always fail (verified: hashing an
    // already-hashed value produces something the plain password never
    // compares equal to).
    const newUser = new Muser({
      email,
      userName: username,
      password,
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
    res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Muser
      .findOne({ email })
      .select("+password");
   
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
      message: "Something went wrong. Please try again.",
    });
  }
});

// --- ACCOUNT ACCESS MANAGEMENT ---

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await Muser.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, code: "ACCOUNT_NOT_FOUND", message: "No account found with that email address." });
    }

    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendVerificationEmail(email, resetLink);
    res.status(200).json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Couldn't send the reset email. Please try again." });
  }
});

// Verifies the short-lived reset token /forgot-password emailed to the
// user (signed separately from the persistent login cookie) — it was
// previously never checked at all; this route required a valid existing
// *login* session instead, which a logged-out user who forgot their
// password by definition doesn't have.
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, code: "MISSING_FIELDS", message: "Reset token and new password are required." });
    }

    const decoded = jwt.verify(token, secretKey);
    const user = await Muser.findById(decoded.userId);

    if (!user) return res.status(404).json({ success: false, code: "ACCOUNT_NOT_FOUND", message: "Account not found." });

    // Muser's pre('save') hook hashes `password` whenever it's modified —
    // hashing it here too would double-hash it (see /register for the
    // same fix and why).
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset execution successful' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Your reset link has expired. Please request a new one." });
  }
});

// Clean up endpoint redundancy loops
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

router.post("/send-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, code: "MISSING_FIELDS", message: "Email is required." });
    }
    const existingUser = await Muser.findOne({ email, onboardingComplete: true });
    if (existingUser) {
      return res.status(400).json({ success: false, code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists." });
    }

    const verificationCode = crypto.randomInt(100000, 1000000).toString();

    // Find or create a not-yet-onboarded holding record for this email so
    // the code has somewhere to live until /verify-email is called.
    await Muser.findOneAndUpdate(
      { email },
      {
        email,
        emailVerificationCode: verificationCode,
        emailVerificationExpires: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    await sendVerificationEmail(email, verificationCode);

    res.status(200).json({ success: true, message: "Verification code sent.", email, nextStep: "verify-email" });
  } catch (error) {
    console.error("Send verification error:", error);
    res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Couldn't send the verification email. Please try again." });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        code: "MISSING_FIELDS",
        message: "Email and verification code are required.",
      });
    }

    const user = await Muser.findOne({ email }).select("+emailVerificationCode +emailVerificationExpires");

    const isValidCode =
      !!user &&
      user.emailVerificationCode === code &&
      user.emailVerificationExpires &&
      user.emailVerificationExpires.getTime() > Date.now();

    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        message: "That code doesn't match. Please check your email or request a new code.",
      });
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

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
      message:"Email verified successfully.",
      redirectTo:`/onboarding?userId=${user._id}&userName=${user.userName}`,
      userId: user._id,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong during verification. Please try again.",
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
      const user = await Muser.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          code: "ACCOUNT_NOT_FOUND",
          message: "Account not found. Please sign up again.",
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

        profilePicture = uploadResult.key;
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
          ...(interests && { interests }),
          ...(goals && { goals }),
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

      res.cookie("token", token, cookieOptions);

      res.cookie("logged_in", "true", {
        ...cookieOptions,
        httpOnly: false,
      });

      const redirectUrl =
        `/auth-success?auth_status=success` +
        `&username=${updatedUser.userName}`;

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
        code: "SERVER_ERROR",
        message: "Couldn't save your profile. Please try again.",
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
      code: "SERVER_ERROR",
      message: "Couldn't update your key. Please try again.",
    });
  }

});


module.exports = router;