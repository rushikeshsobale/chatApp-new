const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  userName: { type: String,  required: true },
  password:{ type: String, minlength: 3, maxlength: 1024, required:true },
  firstName: { type: String },
  lastName: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'] },
  birthDate: { type: Date },
  location: { type: String },
  profilePicture: { type: String },
  bio: { type: String, maxlength: 300 },
  isPrivate: { type: Boolean, default: false }, // If true, requests must be accepted
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
  followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // Interests
  interests: {
    music: [{ type: String }],
    sports: [{ type: String }],
    movies: [{ type: String }],
    books: [{ type: String }],
    hobbies: [{ type: String }]
  },
  
  // Favorites
  favorites: {
    singer: { type: String },
    sportsperson: { type: String },
    movie: { type: String },
    book: { type: String },
    food: { type: String },
    cuisine: { type: String }
  },
  
  // Professional
  professional: {
    profession: { type: String },
    education: { type: String },
    skills: [{ type: String }],
    workExperience: { type: String }
  },
  
  // Social
  social: {
    website: { type: String },
    twitter: { type: String },
    instagram: { type: String },
    linkedin: { type: String }
  },
  
  // System
  emailVerified: { type: Boolean, default: false },
  onboardingComplete: { type: Boolean, default: false },
  lastUpdated: { type: Date },
  createdAt: { type: Date, default: Date.now },
  
  // Your existing fields
  phone: { type: String },
  requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Muser', userSchema);