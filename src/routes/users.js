const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const usersController = require("../controllers/users");

const router = express.Router();

router.get("/profile/:username", usersController.getUserProfile);
router.get("/search", usersController.searchUsers);

router.use(authenticateToken);

router.put("/profile", usersController.updateUserProfile);
router.post("/follow", usersController.followUser);
router.delete("/unfollow/:user_id", usersController.unfollowUser);
router.get("/following/:user_id?", usersController.getFollowing);
router.get("/followers/:user_id?", usersController.getFollowers);
router.get("/stats/:user_id?", usersController.getUserStats);
router.get("/suggested", usersController.getSuggestedUsers);

module.exports = router;
