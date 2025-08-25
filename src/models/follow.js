const { query } = require("../utils/database");

const followUser = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself");
  }

  try {
    const result = await query(
      `INSERT INTO follows (follower_id, following_id) 
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING *`,
      [followerId, followingId]
    );
    
    if (result.rowCount === 0) {
      const existingFollow = await query(
        `SELECT * FROM follows 
         WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId]
      );
      return existingFollow.rows[0];
    }
    
    return result.rows[0];
  } catch (error) {
    if (error.constraint === 'follows_following_id_fkey') {
      throw new Error('User to follow does not exist');
    }
    throw error;
  }
};

const unfollowUser = async (followerId, followingId) => {
  const result = await query(
    `DELETE FROM follows 
     WHERE follower_id = $1 AND following_id = $2
     RETURNING id`,
    [followerId, followingId]
  );
  return result.rowCount > 0;
};

const getFollowing = async (userId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT f.*, u.username, u.full_name, u.created_at as user_created_at
     FROM follows f
     JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = $1 AND u.is_deleted = FALSE
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

const getFollowers = async (userId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT f.*, u.username, u.full_name, u.created_at as user_created_at
     FROM follows f
     JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = $1 AND u.is_deleted = FALSE
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

const getFollowCounts = async (userId) => {
  const result = await query(
    `SELECT 
       (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count,
       (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count`,
    [userId]
  );
  return result.rows[0];
};

const isFollowing = async (followerId, followingId) => {
  if (followerId === followingId) return false;
  
  const result = await query(
    `SELECT id FROM follows 
     WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  );
  return result.rowCount > 0;
};

const getSuggestedUsers = async (userId, limit = 5) => {
  const result = await query(
    `SELECT u.id, u.username, u.full_name, u.created_at
     FROM users u
     WHERE u.id != $1 
     AND u.is_deleted = FALSE
     AND NOT EXISTS (
       SELECT 1 FROM follows f 
       WHERE f.follower_id = $1 AND f.following_id = u.id
     )
     ORDER BY u.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  getFollowCounts,
  isFollowing,
  getSuggestedUsers
};
