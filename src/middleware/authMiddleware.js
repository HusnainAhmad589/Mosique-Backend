const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { User, Role, TokenBlacklist } = require('../models');
const { Op } = require('sequelize');

/**
 * Hash a JWT string with SHA-256 so we never store raw tokens in the DB.
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * verifyToken  —  Middleware to protect routes.
 *
 * 1. Reads Bearer token from Authorization header.
 * 2. Verifies the JWT signature and expiry.
 * 3. Checks whether the token has been blacklisted (logout).
 * 4. Attaches the decoded payload to req.user.
 */
const verifyToken = async (req, res, next) => {
  try {
    // Read token from HttpOnly cookie (preferred) or Authorization header (fallback)
    let token = req.cookies?.mosique_token;

    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // 1️⃣  Verify JWT signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    // 2️⃣  Check token blacklist (has user logged out?)
    const tokenHash = hashToken(token);
    const blacklisted = await TokenBlacklist.findOne({
      where: {
        token_hash: tokenHash,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please log in again.',
      });
    }

    // 3️⃣  Check user still exists and is active
    const user = await User.findOne({
      where: { id: decoded.userId },
      include: [{ model: Role, attributes: ['slug'] }]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.',
      });
    }

    // Attach user info to the request object
    // Transform to match the old raw SQL output structure for compatibility
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      role: user.Role.slug
    };
    req.token = token; // needed by logout
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * Role hierarchy — higher roles inherit all permissions of lower roles.
 *
 *   superAdmin  (level 5) → can access everything
 *   admin       (level 4) → can access admin, moderator, artist, listener
 *   moderator   (level 3) → can access moderator, artist, listener
 *   artist      (level 2) → can access artist, listener
 *   listener    (level 1) → can access listener only
 */
const ROLE_HIERARCHY = {
  listener:   1,
  artist:     2,
  moderator:  3,
  admin:      4,
  superAdmin: 5,
};

/**
 * requireRole  —  Restrict access to specific roles using hierarchy.
 *
 * Usage:
 *   requireRole('admin')              → admin + superAdmin can access
 *   requireRole('artist')             → artist + moderator + admin + superAdmin
 *   requireRole('superAdmin', true)   → ONLY superAdmin (exact match, no hierarchy)
 */
const requireRole = (minimumRole, exactMatch = false) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. You do not have permission to access this resource.',
    });
  }

  const userLevel    = ROLE_HIERARCHY[req.user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole]  || 0;

  // Exact match mode: only the specific role is allowed (used for superAdmin-only actions)
  if (exactMatch) {
    if (req.user.role !== minimumRole) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access this resource.',
      });
    }
    return next();
  }

  // Hierarchy mode: user's level must be >= required level
  if (userLevel < requiredLevel) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. You do not have permission to access this resource.',
    });
  }

  next();
};

module.exports = { verifyToken, requireRole, hashToken };
