const logger = require("../utils/logger");
const { 
  likePost, 
  unlikePost, 
  getPostLikes, 
  getUserLikes,
  hasUserLikedPost,
  getLikeCount
} = require("../models/like");

const likePostHandler = async (req, res, next) => {
  try {
    const { post_id } = req.body;
    const userId = req.user.id;

    if (!post_id) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const like = await likePost(userId, post_id);
    const likeCount = await getLikeCount(post_id);
    
    res.status(201).json({
      success: true,
      data: {
        ...like,
        like_count: likeCount,
        has_liked: true
      }
    });
  } catch (error) {
    logger.error(`Error in likePostHandler: ${error.message}`);
    next(error);
  }
};

const unlikePostHandler = async (req, res, next) => {
  try {
    const { post_id } = req.params;
    const userId = req.user.id;

    if (!post_id) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const success = await unlikePost(userId, post_id);
    
    if (!success) {
      return res.status(404).json({ error: "Like not found or already removed" });
    }

    const likeCount = await getLikeCount(post_id);
    
    res.json({
      success: true,
      data: {
        message: "Post unliked successfully",
        like_count: likeCount,
        has_liked: false
      }
    });
  } catch (error) {
    logger.error(`Error in unlikePostHandler: ${error.message}`);
    next(error);
  }
};

const getPostLikesHandler = async (req, res, next) => {
  try {
    const { post_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!post_id) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const [likes, likeCount] = await Promise.all([
      getPostLikes(post_id, parseInt(limit), parseInt(offset)),
      getLikeCount(post_id)
    ]);
    
    res.json({
      success: true,
      data: {
        likes,
        count: likes.length,
        total: likeCount,
        has_more: likes.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error in getPostLikesHandler: ${error.message}`);
    next(error);
  }
};

const getUserLikesHandler = async (req, res, next) => {
  try {
    const userId = req.params.user_id || req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const likedPosts = await getUserLikes(userId, parseInt(limit), parseInt(offset));
    
    const postsWithLikeCounts = await Promise.all(
      likedPosts.map(async (post) => {
        const count = await getLikeCount(post.id);
        return {
          ...post,
          like_count: count
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        posts: postsWithLikeCounts,
        count: likedPosts.length,
        has_more: likedPosts.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error in getUserLikesHandler: ${error.message}`);
    next(error);
  }
};

const getLikeStatusHandler = async (req, res, next) => {
  try {
    const { post_id } = req.params;
    const userId = req.user.id;

    if (!post_id) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const [hasLiked, likeCount] = await Promise.all([
      hasUserLikedPost(userId, post_id),
      getLikeCount(post_id)
    ]);
    
    res.json({
      success: true,
      data: {
        has_liked: hasLiked,
        like_count: likeCount
      }
    });
  } catch (error) {
    logger.error(`Error in getLikeStatusHandler: ${error.message}`);
    next(error);
  }
};

module.exports = {
  likePost: likePostHandler,
  unlikePost: unlikePostHandler,
  getPostLikes: getPostLikesHandler,
  getUserLikes: getUserLikesHandler,
  getLikeStatus: getLikeStatusHandler
};
