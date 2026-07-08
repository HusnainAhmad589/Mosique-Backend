const express = require('express');
const router = express.Router();

const { getAllUsers, updateUserRole, updateUserStatus, getStats } = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────
//  Protected Admin Routes
// ─────────────────────────────────────────────────────────

// Apply verifyToken to all routes in this file
router.use(verifyToken);

// GET /api/admin/users
// admin and above (admin + superAdmin) can view the user list
router.get('/users', requireRole('admin'), getAllUsers);

// PUT /api/admin/users/:id/role
// ONLY superAdmin can change roles (exact match — no hierarchy inheritance)
router.put('/users/:id/role', requireRole('superAdmin', true), updateUserRole);

// PUT /api/admin/users/:id/status
// admin and above can change status
router.put('/users/:id/status', requireRole('admin'), updateUserStatus);

// GET /api/admin/stats
router.get('/stats', requireRole('admin'), getStats);

module.exports = router;
