const mongoose = require("mongoose");
require('dotenv').config();
const db = mongoose.connection;
console.log(process.env.MONGO_URI, 'url')
mongoose.connect(`mongodb://localhost:27017/goChat`, {
  
})
.then(() => {

  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});
module.exports = db;