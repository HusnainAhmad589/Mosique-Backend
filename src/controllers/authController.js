const { validationResult } = require('express-validator');
const authService = require('../services/authService');

//  POST /api/auth/register

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const { token, user } = await authService.registerUser(req.body);

    // Set token as an HttpOnly cookie (not accessible by JavaScript)
    res.cookie('mosique_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Mosique 🎵',
      user,
      token,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Register error:', err);
    return res.status(status).json({ success: false, message });
  }
};


//  POST /api/auth/login

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const { email, password } = req.body;
    const { token, user } = await authService.loginUser(email, password);

    // Set token as an HttpOnly cookie (not accessible by JavaScript)
    res.cookie('mosique_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful. Welcome back! 🎵',
      user,
      token,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Login error:', err);
    return res.status(status).json({ success: false, message });
  }
};


//  POST /api/auth/logout
//  (requires verifyToken middleware)
const logout = async (req, res) => {
  try {
    await authService.logoutUser(req.token, req.user.id);

    // Clear the HttpOnly cookie
    res.clearCookie('mosique_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. See you next time! 👋',
    });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


//  GET /api/auth/me
//  (requires verifyToken middleware)
const getMe = async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.id);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('GetMe error:', err);
    return res.status(status).json({ success: false, message });
  }
};

//  PUT /api/auth/change-password
//  (requires verifyToken middleware)
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const { old_password, new_password } = req.body;
    await authService.changeUserPassword(req.user.id, old_password, new_password);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Change Password error:', err);
    return res.status(status).json({ success: false, message });
  }
};

const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    return res.status(200).json({
      success: true,
      message: 'If that email address is in our database, we will send you an email to reset your password.',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Forgot Password error:', err);
    return res.status(status).json({ success: false, message });
  }
};

const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const { token, new_password } = req.body;
    await authService.resetPassword(token, new_password);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login.',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Reset Password error:', err);
    return res.status(status).json({ success: false, message });
  }
};

// PUT /api/auth/me
// (requires verifyToken middleware)
const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const updatedUser = await authService.updateUserProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Update Profile error:', err);
    return res.status(status).json({ success: false, message });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    await authService.deactivateAccount(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Your account has been deactivated.',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Deactivate account error:', err);
    return res.status(status).json({ success: false, message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    await authService.deleteAccount(req.user.id, password);
    return res.status(200).json({
      success: true,
      message: 'Your account has been permanently deleted.',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Delete account error:', err);
    return res.status(status).json({ success: false, message });
  }
};
module.exports = { register, login, logout, getMe, changePassword, forgotPassword, resetPassword, updateProfile, deactivateAccount, deleteAccount };
