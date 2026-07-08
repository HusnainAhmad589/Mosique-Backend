const express  = require('express');
const router   = express.Router();

const { register, login, logout, getMe, changePassword, forgotPassword, resetPassword, updateProfile, deactivateAccount, deleteAccount } = require('../controllers/authController');
const { verifyToken }                     = require('../middleware/authMiddleware');
const { registerValidators, loginValidators, changePasswordValidators, forgotPasswordValidators, resetPasswordValidators } = require('../validators/authValidators');

//  Public routes  (no token required)


// POST /api/auth/register
router.post('/register', registerValidators, register);

// POST /api/auth/login
router.post('/login', loginValidators, login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordValidators, forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordValidators, resetPassword);


//  Protected routes  (valid JWT required)


// POST /api/auth/logout
router.post('/logout', verifyToken, logout);

// GET  /api/auth/me
router.get('/me', verifyToken, getMe);

// PUT /api/auth/me
router.put('/me', verifyToken, updateProfile);

// PUT /api/auth/change-password
router.put('/change-password', verifyToken, changePasswordValidators, changePassword);

// DELETE /api/auth/deactivate-account
router.delete('/deactivate-account', verifyToken, deactivateAccount);

// DELETE /api/auth/delete-account
router.delete('/delete-account', verifyToken, deleteAccount);

module.exports = router;
