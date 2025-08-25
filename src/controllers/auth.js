const {
  createUser,
  getUserByUsername,
  verifyPassword,
} = require("../models/user");
const { generateToken } = require("../utils/jwt");
const logger = require("../utils/logger");

const register = async (req, res) => {
  try {
    const { username, email, password, full_name } = req.validatedData;

    const user = await createUser({ username, email, password, full_name });

    const token = generateToken({
      userId: user.id,
      username: user.username,
    });

    logger.verbose(`New user registered: ${username}`);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
      },
      token,
    });
  } catch (error) {
    logger.critical("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.validatedData;

    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
    });

    logger.verbose(`User logged in: ${username}`);

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
      },
      token,
    });
  } catch (error) {
    logger.critical("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    logger.critical("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};
