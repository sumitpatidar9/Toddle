const { query } = require("../utils/database");

const createComment = async (userId, postId, content) => {
  const result = await query(
    `INSERT INTO comments (user_id, post_id, content) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [userId, postId, content]
  );
  return result.rows[0];
};

const updateComment = async (commentId, userId, content) => {
  const result = await query(
    `UPDATE comments 
     SET content = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 AND user_id = $3 AND is_deleted = FALSE
     RETURNING *`,
    [content, commentId, userId]
  );
  return result.rows[0];
};

const deleteComment = async (commentId, userId) => {
  const result = await query(
    `UPDATE comments 
     SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 AND (user_id = $2 OR (SELECT p.user_id FROM posts p JOIN comments c ON p.id = c.post_id WHERE c.id = $1) = $2)
     RETURNING id`,
    [commentId, userId]
  );
  return result.rowCount > 0;
};

const getPostComments = async (postId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT c.*, u.username, u.full_name 
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.post_id = $1 AND c.is_deleted = FALSE
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );
  return result.rows;
};

const getCommentById = async (commentId) => {
  const result = await query(
    `SELECT c.*, u.username, u.full_name 
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = $1 AND c.is_deleted = FALSE`,
    [commentId]
  );
  return result.rows[0];
};

module.exports = {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
  getCommentById
};
