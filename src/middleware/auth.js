const { verifyToken } = require("../utils/jwt");
const { getUserById } = require("../models/user");
const logger = require("../utils/logger");

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
	try {
		const authHeader = req.headers["authorization"];

		if (!authHeader) {
			return res.status(401).json({ error: "Access token required" });
		}

		const decoded = verifyToken(authHeader);
		console.log('Decoded token:', decoded); // Debug log

		// The token is generated with userId in the payload
		if (!decoded.userId) {
			console.error('Token missing userId:', decoded);
			return res.status(401).json({ error: "Invalid token format - missing user ID" });
		}

		const user = await getUserById(decoded.userId);
		console.log('Found user:', user); // Debug log
		if (!user) {
			return res.status(401).json({ error: "User not found" });
		}

		req.user = user;
		next();
	} catch (error) {
		logger.critical("Authentication error:", error.message);
		return res.status(403).json({ error: "Invalid or expired token" });
	}
};

/**
 * Middleware to optionally authenticate tokens (for endpoints that work with/without auth)
 */
const optionalAuth = async (req, res, next) => {
	try {
		const authHeader = req.headers["authorization"];

		if (authHeader) {
			const decoded = verifyToken(authHeader);
			const user = await getUserById(decoded.userId);
			if (user) {
				req.user = user;
			}
		}

		next();
	} catch (error) {
		// Ignore auth errors for optional auth
		next();
	}
};

module.exports = {
	authenticateToken,
	optionalAuth,
};
