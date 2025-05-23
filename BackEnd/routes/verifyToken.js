const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || "mySecreateKey";
const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'];
  
  if (!token) {
      return res.status(401).json({ message: "Token not provided" });
  }
    // Handle Bearer token format
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1]; // Extract actual token
    }
  try {
    const decoded = jwt.verify(token, secretKey);
    req.decoded = decoded; 
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ message: "Invalid token" });
  }
};
module.exports = verifyToken;
