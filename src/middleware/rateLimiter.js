'use strict';

/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects APIs against excessive, abusive, or automated requests.
 */

const requestStore = new Map();

// Periodic cleanup of expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // Default: 15 minutes
  const max = options.max || 100; // Default: 100 requests per window
  const message = options.message || 'Too many requests from this IP, please try again later.';

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || ''}${req.path}_${ip}`;
    const now = Date.now();

    let record = requestStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      requestStore.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
};

// Preset limiters for different sensitivity levels
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: 'General API rate limit exceeded. Please slow down.'
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'File upload rate limit reached. Please wait before uploading more content.'
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  uploadLimiter,
};
