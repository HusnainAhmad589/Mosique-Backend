const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole('superAdmin', true));

router.get('/users', superAdminController.getAllUsers);
router.put('/users/:id/role', superAdminController.updateUserRole);
router.put('/users/:id/status', superAdminController.updateUserStatus);
router.get('/roles', superAdminController.getRoles);

// New endpoints for stats and admin creation
router.get('/stats', superAdminController.getStats);
router.post('/admins', superAdminController.createAdmin);
router.delete('/users/batch', superAdminController.batchDeleteUsers);

module.exports = router;
