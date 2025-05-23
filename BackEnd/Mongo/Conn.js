const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const db = mongoose.connection;

mongoose.connect(process.env.MONGO_URI, {

})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});
module.exports = db;