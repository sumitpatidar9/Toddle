const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes,
  getLikeStatus
} = require("../controllers/likes");

router.post("/", authenticateToken, likePost);
router.delete("/:post_id", authenticateToken, unlikePost);
router.get("/post/:post_id", getPostLikes);
router.get("/user/:user_id?", authenticateToken, getUserLikes);
router.get("/status/:post_id", authenticateToken, getLikeStatus);

module.exports = router;
