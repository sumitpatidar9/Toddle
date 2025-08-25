const { query } = require("../utils/database");

const likePost = async (userId, postId) => {
  try {
    const result = await query(
      `INSERT INTO likes (user_id, post_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, post_id) DO NOTHING
       RETURNING *`,
      [userId, postId]
    );
    
    if (result.rowCount === 0) {
      const existingLike = await query(
        `SELECT * FROM likes WHERE user_id = $1 AND post_id = $2`,
        [userId, postId]
      );
      return existingLike.rows[0];
    }
    
    return result.rows[0];
  } catch (error) {
    console.error("Error in likePost:", error);
    throw error;
  }
};

const unlikePost = async (userId, postId) => {
  const result = await query(
    `DELETE FROM likes 
     WHERE user_id = $1 AND post_id = $2
     RETURNING id`,
    [userId, postId]
  );
  return result.rowCount > 0;
};

const getPostLikes = async (postId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT l.*, u.username, u.full_name 
     FROM likes l
     JOIN users u ON l.user_id = u.id
     WHERE l.post_id = $1
     ORDER BY l.created_at DESC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );
  return result.rows;
};

const getUserLikes = async (userId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT l.*, p.content, p.media_url, p.created_at as post_created_at,
            u.username, u.full_name as author_name
     FROM likes l
     JOIN posts p ON l.post_id = p.id
     JOIN users u ON p.user_id = u.id
     WHERE l.user_id = $1 AND p.is_deleted = FALSE
     ORDER BY l.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

const hasUserLikedPost = async (userId, postId) => {
  const result = await query(
    `SELECT id FROM likes 
     WHERE user_id = $1 AND post_id = $2`,
    [userId, postId]
  );
  return result.rowCount > 0;
};

const getLikeCount = async (postId) => {
  const result = await query(
    `SELECT COUNT(*) as count 
     FROM likes 
     WHERE post_id = $1`,
    [postId]
  );
  return parseInt(result.rows[0].count, 10);
};

const likeComment = async (commentId, userId) => {
  try {
    const result = await query(
      `INSERT INTO comment_likes (user_id, comment_id) 
       VALUES ($1, $2)
       ON CONFLICT (user_id, comment_id) DO NOTHING
       RETURNING *`,
      [userId, commentId]
    );
    
    if (result.rowCount === 0) {
      const existingLike = await query(
        `SELECT * FROM comment_likes WHERE user_id = $1 AND comment_id = $2`,
        [userId, commentId]
      );
      return existingLike.rows[0];
    }
    
    return result.rows[0];
  } catch (error) {
    console.error("Error in likeComment:", error);
    throw error;
  }
};

const unlikeComment = async (commentId, userId) => {
  const result = await query(
    `DELETE FROM comment_likes 
     WHERE user_id = $1 AND comment_id = $2
     RETURNING id`,
    [userId, commentId]
  );
  return result.rowCount > 0;
};

const getCommentLikeCount = async (commentId) => {
  const result = await query(
    `SELECT COUNT(*) FROM comment_likes 
     WHERE comment_id = $1`,
    [commentId]
  );
  return parseInt(result.rows[0].count, 10);
};

const hasUserLikedComment = async (commentId, userId) => {
  const result = await query(
    `SELECT id FROM comment_likes 
     WHERE comment_id = $1 AND user_id = $2`,
    [commentId, userId]
  );
  return result.rowCount > 0;
};

module.exports = {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes,
  hasUserLikedPost,
  getLikeCount,
  likeComment,
  unlikeComment,
  getCommentLikeCount,
  hasUserLikedComment
};
