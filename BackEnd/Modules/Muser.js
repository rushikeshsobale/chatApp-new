const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  birthdate: { type: Date },
  phone: { type: String },
  bio:{type:String},
  // Profile picture (URL or file path)
  profilePicture: { type: String }, 
  friends: [
    {
      friendId: {
        type: String,
        ref: 'User'  // Reference to the User model
      },
      isFriend: String  // 'friends' or 'sent', etc.
    }
  ],
  messages: { type: Object }, // Define messages as an object
});

const User = mongoose.model('User', userSchema);
module.exports = User;
