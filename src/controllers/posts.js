const {
  createPost,
  getPostById,
  getPostsByUserId,
  deletePost,
} = require("../models/post.js");
const logger = require("../utils/logger");

const create = async (req, res) => {
  try {
    const { content, media_url, comments_enabled } = req.validatedData;
    const userId = req.user.id;

    const post = await createPost({
      user_id: userId,
      content,
      media_url,
      comments_enabled,
    });

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: post
    });
  } catch (error) {
    logger.error(`Create post error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to create post" 
    });
  }
};

const getById = async (req, res) => {
  try {
    const { post_id } = req.params;

    const post = await getPostById(parseInt(post_id));

    if (!post) {
      return res.status(404).json({ 
        success: false,
        error: "Post not found" 
      });
    }

    res.json({ 
      success: true,
      data: post 
    });
  } catch (error) {
    logger.error(`Get post error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to get post" 
    });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { user_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const posts = await getPostsByUserId(parseInt(user_id), limit, offset);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: posts.length,
        hasMore: posts.length === limit
      },
    });
  } catch (error) {
    logger.error(`Get user posts error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to get user posts" 
    });
  }
};

const getMyPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const posts = await getPostsByUserId(req.user.id, limit, offset);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: posts.length,
        hasMore: posts.length === limit
      },
    });
  } catch (error) {
    logger.error(`Get my posts error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to get user posts" 
    });
  }
};

const remove = async (req, res) => {
  try {
    const { post_id } = req.params;
    const userId = req.user.id;

    const success = await deletePost(parseInt(post_id), userId);

    if (!success) {
      return res.status(404).json({ 
        success: false,
        error: "Post not found or unauthorized" 
      });
    }

    res.json({ 
      success: true,
      message: "Post deleted successfully" 
    });
  } catch (error) {
    logger.error(`Delete post error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete post" 
    });
  }
};

module.exports = {
  create,
  getById,
  getUserPosts,
  getMyPosts,
  remove,
};
