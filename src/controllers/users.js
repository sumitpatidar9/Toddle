const logger = require("../utils/logger");
const { 
  followUser, 
  unfollowUser, 
  getFollowing: getFollowingUsers, 
  getFollowers: getFollowersList, 
  getFollowCounts,
  isFollowing,
  getSuggestedUsers
} = require("../models/follow");
const { query } = require("../utils/database");

const followUserHandler = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const followerId = req.user.id;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (user_id == followerId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const follow = await followUser(followerId, user_id);
    const counts = await getFollowCounts(followerId);
    
    res.status(201).json({
      success: true,
      data: {
        ...follow,
        following_count: counts.following_count,
        followers_count: counts.followers_count,
        is_following: true
      }
    });
  } catch (error) {
    logger.error(`Error in followUserHandler: ${error.message}`);
    next(error);
  }
};

const unfollowUserHandler = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const followerId = req.user.id;

    if (!user_id) {
      throw new BadRequestError("User ID is required");
    }

    if (user_id == followerId) {
      throw new BadRequestError("Cannot unfollow yourself");
    }

    const success = await unfollowUser(followerId, user_id);
    
    if (!success) {
      throw new NotFoundError("Follow relationship not found");
    }

    const counts = await getFollowCounts(followerId);
    
    res.json({
      success: true,
      data: {
        message: "Successfully unfollowed user",
        following_count: counts.following_count,
        followers_count: counts.followers_count,
        is_following: false
      }
    });
  } catch (error) {
    logger.error(`Error in unfollowUserHandler: ${error.message}`);
    next(error);
  }
};

const getMyFollowingHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const following = await getFollowing(userId, parseInt(limit), parseInt(offset));
    const counts = await getFollowCounts(userId);
    
    res.json({
      success: true,
      data: {
        following,
        count: following.length,
        total: parseInt(counts.following_count, 10),
        has_more: following.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error in getMyFollowingHandler: ${error.message}`);
    next(error);
  }
};

const getMyFollowersHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const followers = await getFollowers(userId, parseInt(limit), parseInt(offset));
    const counts = await getFollowCounts(userId);
    
    // Check if the current user follows back each follower
    const followersWithFollowStatus = await Promise.all(
      followers.map(async (follower) => {
        const isFollowingBack = await isFollowing(userId, follower.id);
        return {
          ...follower,
          is_following_back: isFollowingBack
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        followers: followersWithFollowStatus,
        count: followers.length,
        total: parseInt(counts.followers_count, 10),
        has_more: followers.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error in getMyFollowersHandler: ${error.message}`);
    next(error);
  }
};

const getUserStatsHandler = async (req, res, next) => {
  try {
    const userId = req.params.user_id || req.user.id;
    
    // Get user details
    const userResult = await query(
      `SELECT id, username, full_name, created_at 
       FROM users 
       WHERE id = $1 AND is_deleted = FALSE`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new NotFoundError("User not found");
    }
    
    const counts = await getFollowCounts(userId);
    
    // Check if the current user follows this user (if different from target user)
    let isFollowingUser = false;
    if (req.user && req.user.id != userId) {
      isFollowingUser = await isFollowing(req.user.id, userId);
    }
    
    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        stats: {
          following_count: parseInt(counts.following_count, 10),
          followers_count: parseInt(counts.followers_count, 10),
          is_following: isFollowingUser
        }
      }
    });
  } catch (error) {
    logger.error(`Error in getUserStatsHandler: ${error.message}`);
    next(error);
  }
};

const getSuggestedUsersHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;
    
    const suggestedUsers = await getSuggestedUsers(userId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        suggested_users: suggestedUsers,
        count: suggestedUsers.length
      }
    });
  } catch (error) {
    logger.error(`Error in getSuggestedUsersHandler: ${error.message}`);
    next(error);
  }
};

const searchUsersHandler = async (req, res, next) => {
  try {
    const { q, limit = 10, offset = 0 } = req.query;
    
    if (!q || q.trim() === '') {
      throw new BadRequestError("Search query is required");
    }
    
    const searchTerm = `%${q}%`;
    const result = await query(
      `SELECT id, username, full_name, created_at
       FROM users
       WHERE (username ILIKE $1 OR full_name ILIKE $1)
       AND is_deleted = FALSE
       ORDER BY 
         CASE 
           WHEN username ILIKE $1 AND full_name ILIKE $1 THEN 1
           WHEN username ILIKE $1 THEN 2
           ELSE 3
         END,
         created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchTerm, parseInt(limit), parseInt(offset)]
    );
    
    // If user is authenticated, add follow status for each result
    let users = result.rows;
    if (req.user) {
      const userIds = users.map(u => u.id);
      const followingMap = new Map();
      
      if (userIds.length > 0) {
        const followingResult = await query(
          `SELECT following_id FROM follows 
           WHERE follower_id = $1 AND following_id = ANY($2::int[])`,
          [req.user.id, userIds]
        );
        
        followingResult.rows.forEach(row => {
          followingMap.set(row.following_id, true);
        });
      }
      
      users = users.map(user => ({
        ...user,
        is_following: followingMap.has(user.id)
      }));
    }
    
    res.json({
      success: true,
      data: {
        users,
        count: users.length,
        has_more: users.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error in searchUsersHandler: ${error.message}`);
    next(error);
  }
};

const getUserProfileHandler = async (req, res, next) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      throw new BadRequestError("Username is required");
    }
    
    // Get user details
    const userResult = await query(
      `SELECT id, username, full_name, created_at 
       FROM users 
       WHERE username = $1 AND is_deleted = FALSE`,
      [username]
    );
    
    if (userResult.rows.length === 0) {
      throw new NotFoundError("User not found");
    }
    
    const user = userResult.rows[0];
    const counts = await getFollowCounts(user.id);
    
    // Check if the current user follows this user
    let isFollowingUser = false;
    if (req.user && req.user.id !== user.id) {
      isFollowingUser = await isFollowing(req.user.id, user.id);
    }
    
    res.json({
      success: true,
      data: {
        user,
        stats: {
          following_count: parseInt(counts.following_count, 10),
          followers_count: parseInt(counts.followers_count, 10),
          is_following: isFollowingUser
        }
      }
    });
  } catch (error) {
    logger.error(`Error in getUserProfileHandler: ${error.message}`);
    next(error);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const targetUserId = req.params.user_id || req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const followers = await getFollowersList(targetUserId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: followers,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: followers.length,
        has_more: followers.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error in getFollowers: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to get followers list"
    });
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const targetUserId = req.params.user_id || req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    const following = await getFollowingUsers(targetUserId, parseInt(limit), parseInt(offset));
    res.json({
      success: true,
      data: following,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: following.length,
        has_more: following.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error in getFollowing: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to get following list"
    });
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    console.log('Update profile request body:', req.body);
    console.log('Authenticated user ID:', req.user?.id);
    
    const { full_name } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error('No user ID in request');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!full_name) {
      console.error('Full name is required');
      return res.status(400).json({ 
        success: false,
        error: 'Full name is required' 
      });
    }

    console.log(`Updating user ${userId} with full_name:`, full_name);

    try {
      const result = await query(
        `UPDATE users 
         SET full_name = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, username, email, full_name, created_at, updated_at`,
        [full_name, userId]
      );

      console.log('Update result:', result.rows[0]);

      if (result.rows.length === 0) {
        console.error('User not found for ID:', userId);
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      console.log('Successfully updated user profile');
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error(`Error updating user profile: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to update profile" 
    });
  }
};

module.exports = {
  followUser: followUserHandler,
  unfollowUser: unfollowUserHandler,
  getFollowing,
  getFollowers,
  getMyFollowing: getMyFollowingHandler,
  getMyFollowers: getMyFollowersHandler,
  getUserStats: getUserStatsHandler,
  getSuggestedUsers: getSuggestedUsersHandler,
  searchUsers: searchUsersHandler,
  getUserProfile: getUserProfileHandler,
  updateUserProfile
};
