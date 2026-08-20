'use strict';

const IORedis = require('ioredis');

const redis = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1
});

redis.on('error', (err) => {
  // Silent fail if redis disconnected
});

const ONLINE_SET = 'presence:online_users';
const TTL_SECONDS = 60; // Active threshold (last 60s)

/**
 * Record user active timestamp and cache user identity in Redis
 */
const recordUserActivity = async (user) => {
  if (!user || !user.id) return;
  try {
    const now = Date.now();
    const role = user.role || user.Role?.slug || 'listener';
    const displayName = user.display_name || user.username || `User #${user.id}`;
    
    const multi = redis.multi();
    multi.zadd(ONLINE_SET, now, String(user.id));
    multi.set(
      `presence:user:${user.id}`,
      JSON.stringify({
        id: user.id,
        username: user.username,
        display_name: displayName,
        role: role,
        avatar_url: user.avatar_url || null,
        last_seen: now
      }),
      'EX',
      TTL_SECONDS * 2
    );
    await multi.exec();
  } catch (err) {
    // Non-blocking
  }
};

/**
 * Get count and details of currently online users
 */
const getOnlineUsers = async () => {
  try {
    const now = Date.now();
    const threshold = now - (TTL_SECONDS * 1000);
    
    // Prune inactive entries older than 60 seconds
    await redis.zremrangebyscore(ONLINE_SET, 0, threshold);
    
    // Retrieve all active user IDs
    const userIds = await redis.zrange(ONLINE_SET, 0, -1);
    if (!userIds || userIds.length === 0) {
      return { totalOnline: 0, users: [] };
    }

    const userKeys = userIds.map(id => `presence:user:${id}`);
    const rawUserData = await redis.mget(...userKeys);
    
    const users = [];
    for (let i = 0; i < userIds.length; i++) {
      if (rawUserData[i]) {
        try {
          users.push(JSON.parse(rawUserData[i]));
        } catch (e) {
          users.push({ id: parseInt(userIds[i], 10), last_seen: now });
        }
      } else {
        users.push({ id: parseInt(userIds[i], 10), last_seen: now });
      }
    }

    return {
      totalOnline: users.length,
      users
    };
  } catch (err) {
    console.error('Error fetching online users:', err);
    return { totalOnline: 0, users: [] };
  }
};

/**
 * Remove user immediately from online presence (on logout)
 */
const removeUserPresence = async (userId) => {
  if (!userId) return;
  try {
    await redis.zrem(ONLINE_SET, String(userId));
    await redis.del(`presence:user:${userId}`);
  } catch (err) {}
};

module.exports = {
  recordUserActivity,
  getOnlineUsers,
  removeUserPresence
};
