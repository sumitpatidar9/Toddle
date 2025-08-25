const jwt = require("jsonwebtoken");
const logger = require("./logger");

require("dotenv").config();

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
};

const verifyToken = (token) => {
  if (!token) {
    throw new Error("No token provided");
  }
  
  try {
    const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    if (!tokenValue) {
      throw new Error("Token cannot be empty");
    }
    return jwt.verify(tokenValue, process.env.JWT_SECRET);
  } catch (error) {
    logger.critical("Token verification failed:", error.message);
    throw new Error("Invalid or expired token");
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
