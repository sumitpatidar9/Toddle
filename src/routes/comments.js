const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const commentsController = require("../controllers/comments");

router.post("/", authenticateToken, commentsController.createComment);
router.put("/:comment_id", authenticateToken, commentsController.updateComment);
router.delete("/:comment_id", authenticateToken, commentsController.deleteComment);
router.get("/post/:post_id", commentsController.getPostComments);
router.get("/:comment_id", commentsController.getComment);
router.post("/:comment_id/like", authenticateToken, commentsController.likeComment);
router.delete("/:comment_id/like", authenticateToken, commentsController.unlikeComment);

module.exports = router;
