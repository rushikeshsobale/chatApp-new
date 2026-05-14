const jwt = require("jsonwebtoken");

const secretKey =
  process.env.JWT_SECRET || "mySecreateKey";

const verifyToken = (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Token not provided",
      });
    }

    const decoded = jwt.verify(token, secretKey);

    req.decoded = decoded;

    next();
  } catch (error) {
    console.error("Error verifying token:", error);

    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

module.exports = verifyToken;