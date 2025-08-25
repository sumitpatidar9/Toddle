const express = require("express");
const {
	validateRequest,
	userRegistrationSchema,
	userLoginSchema,
} = require("../utils/validation");
const { register, login, getProfile } = require("../controllers/auth");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.post("/register", validateRequest(userRegistrationSchema), register);
router.post("/login", validateRequest(userLoginSchema), login);
router.get("/profile", authenticateToken, getProfile);

module.exports = router;
