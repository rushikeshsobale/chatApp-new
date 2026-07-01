const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  // OAuth
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Core Identity
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },

  userName: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,

    // Required only after onboarding
    required: function () {
      return this.onboardingComplete;
    },
  },

  publicKey: {
    type: String,
    default: "",
    maxlength: 5000,
  },

  password: {
    type: String,
    minlength: 6,

    // Required only after onboarding
    required: function () {
      return this.onboardingComplete;
    },

    // Hide password by default
    select: false,
  },

  // Profile
  firstName: {
    type: String,
    trim: true,
  },

  lastName: {
    type: String,
    trim: true,
  },

  gender: {
    type: String,
    enum: [
      "Male",
      "Female",
      "Non-binary",
      "Other",
      "Prefer not to say",
    ],
  },

  birthDate: {
    type: Date,
  },

  location: {
    type: String,
    trim: true,
  },

  profilePicture: {
    type: String,
    default:
      "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
  },

  bio: {
    type: String,
    maxlength: 300,
    default: "",
  },

  isPrivate: {
    type: Boolean,
    default: false,
  },

  keysId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "keysModel",
  },

  // Onboarding
  onboardingComplete: {
    type: Boolean,
    default: false,
  },

  // Interests
  interests: {
    music: [{ type: String }],
    sports: [{ type: String }],
    movies: [{ type: String }],
    books: [{ type: String }],
    hobbies: [{ type: String }],
  },

  // Favorites
  favorites: {
    singer: { type: String },
    sportsperson: { type: String },
    movie: { type: String },
    book: { type: String },
    food: { type: String },
    cuisine: { type: String },
  },

  // Professional
  professional: {
    profession: { type: String },
    education: { type: String },
    skills: [{ type: String }],
    workExperience: { type: String },
  },

  // Social
  social: {
    website: { type: String },
    twitter: { type: String },
    instagram: { type: String },
    linkedin: { type: String },
  },

  // Verification
  emailVerified: {
    type: Boolean,
    default: false,
  },

  lastUpdated: {
    type: Date,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Optional Phone
  phone: {
    type: String,
  },

  // Friends System
  requests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Muser",
    },
  ],

  // Matches what routes/router.js's /sendRequest and /acceptFriendRequest
  // actually store (friendId + a denormalized friendName + request state) —
  // this used to be typed as a plain [ObjectId], which doesn't match what's
  // pushed into it and threw a CastError on every real use.
  friends: [
    {
      friendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Muser",
      },
      friendName: {
        type: String,
      },
      isFriend: {
        type: String,
        enum: ["sent", "recieved", "friends"],
      },
    },
  ],
});

// Password hashing middleware
userSchema.pre("save", async function (next) {
  try {

    // Only hash if modified
    if (!this.isModified("password")) {
      return next();
    }

    // Skip empty password
    if (!this.password) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(
      this.password,
      salt
    );

    next();

  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword =
  async function (candidatePassword) {

    if (!this.password) {
      return false;
    }

    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

module.exports =
  mongoose.model("Muser", userSchema);