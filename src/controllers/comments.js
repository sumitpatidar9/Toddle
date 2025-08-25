const logger = require("../utils/logger");
const { 
  createComment, 
  updateComment, 
  deleteComment, 
  getPostComments, 
  getCommentById 
} = require("../models/comment");
const { unlikeComment, getCommentLikeCount, likeComment } = require("../models/like");

const createCommentHandler = async (req, res, next) => {
  try {
    const { post_id, content } = req.body;
    const userId = req.user.id;

    if (!post_id || !content || content.trim() === '') {
      return res.status(400).json({ error: "Post ID and content are required" });
    }

    const comment = await createComment(userId, post_id, content.trim());
    
    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error(`Error in createCommentHandler: ${error.message}`);
    next(error);
  }
};

const updateCommentHandler = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: "Comment content cannot be empty" });
    }

    const existingComment = await getCommentById(comment_id);
    
    if (!existingComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ error: "You can only update your own comments" });
    }

    if (existingComment.is_deleted) {
      return res.status(400).json({ error: "Cannot update a deleted comment" });
    }

    const updatedComment = await updateComment(comment_id, userId, content.trim());
    
    res.json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    logger.error(`Error in updateCommentHandler: ${error.message}`);
    next(error);
  }
};

const deleteCommentHandler = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const userId = req.user.id;

    const existingComment = await getCommentById(comment_id);
    
    if (!existingComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    if (existingComment.is_deleted) {
      return res.status(400).json({ error: "Comment is already deleted" });
    }

    await deleteComment(comment_id, userId);
    
    res.json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error(`Error in deleteCommentHandler: ${error.message}`);
    next(error);
  }
};

const getPostCommentsHandler = async (req, res, next) => {
  try {
    const { post_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user?.id;

    if (!post_id) {
      throw new BadRequestError("Post ID is required");
    }

    const [comments, totalCount] = await Promise.all([
      getPostComments(post_id, parseInt(limit), parseInt(offset)),
      (async () => {
        const result = await getPostComments(post_id, 1, 0, true);
        return result.length > 0 ? result[0].total_count : 0;
      })()
    ]);

    if (userId) {
      const commentIds = comments.map(c => c.id);
      const userLikes = new Map();
      
      if (commentIds.length > 0) {
        const likes = await getCommentLikesForUser(commentIds, userId);
        likes.forEach(like => {
          userLikes.set(like.comment_id, true);
        });
      }
      
      comments.forEach(comment => {
        comment.has_liked = userLikes.has(comment.id);
      });
    }
    
    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          total: parseInt(totalCount, 10),
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + comments.length) < totalCount
        }
      }
    });
  } catch (error) {
    logger.error(`Error in getPostCommentsHandler: ${error.message}`);
    next(error);
  }
};

const getCommentHandler = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const userId = req.user?.id;

    if (!comment_id) {
      return res.status(400).json({
        success: false,
        error: "Comment ID is required"
      });
    }

    const comment = await getCommentById(comment_id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found"
      });
    }
    
    if (userId) {
      const hasLiked = await hasUserLikedComment(comment_id, userId);
      comment.has_liked = hasLiked;
    }
    
    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error(`Error in getCommentHandler: ${error.message}`);
    next(error);
  }
};

const likeCommentHandler = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const userId = req.user.id;

    if (!comment_id) {
      return res.status(400).json({
        success: false,
        error: "Comment ID is required"
      });
    }

    // Check if comment exists and is not deleted
    const comment = await getCommentById(comment_id);
    if (!comment || comment.is_deleted) {
      return res.status(404).json({
        success: false,
        error: "Comment not found or has been deleted"
      });
    }

    const like = await likeComment(comment_id, userId);
    const likeCount = await getCommentLikeCount(comment_id);
    
    res.status(201).json({
      success: true,
      data: {
        ...like,
        like_count: likeCount,
        has_liked: true
      }
    });
  } catch (error) {
    console.error(`Error in likeCommentHandler: ${error.message}`);
    next(error);
  }
};

/**
 * Unlike a comment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const unlikeCommentHandler = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const userId = req.user.id;

    if (!comment_id) {
      return res.status(400).json({
        success: false,
        error: "Comment ID is required"
      });
    }

    const success = await unlikeComment(comment_id, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Like not found or already removed"
      });
    }

    const likeCount = await getCommentLikeCount(comment_id);
    
    res.json({
      success: true,
      data: {
        message: "Comment unliked successfully",
        like_count: likeCount,
        has_liked: false
      }
    });
  } catch (error) {
    console.error(`Error in unlikeCommentHandler: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createComment: createCommentHandler,
  updateComment: updateCommentHandler,
  deleteComment: deleteCommentHandler,
  getPostComments: getPostCommentsHandler,
  getComment: getCommentHandler,
  likeComment: likeCommentHandler,
  unlikeComment: unlikeCommentHandler
};
