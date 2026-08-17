'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, TokenBlacklist, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { hashToken } = require('../middleware/authMiddleware');
const { safeUser, getUserProfile, updateUserProfile, deactivateAccount, deleteAccount } = require('./auth/userProfileService');
const { forgotPassword, resetPassword, sendResetEmail } = require('./auth/passwordResetService');

const generateToken = (userId, role) =>
  jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

const registerUser = async ({ username, email, password, display_name, role, address }) => {
  const transaction = await sequelize.transaction();
  try {
    const existing = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      },
      transaction
    });

    if (existing) {
      await transaction.rollback();
      const error = new Error('An account with that email or username already exists.');
      error.status = 409;
      throw error;
    }

    const requestedRole = (role === 'artist') ? 'artist' : 'listener';
    const roleRecord = await Role.findOne({
      where: { slug: requestedRole },
      transaction
    });

    if (!roleRecord) {
      await transaction.rollback();
      const error = new Error('Role not found in database.');
      error.status = 500;
      throw error;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      username,
      email,
      password_hash,
      display_name: display_name || username,
      role_id: roleRecord.id,
      address: address || null
    }, { transaction });

    await transaction.commit();

    try {
      const adminRoles = await Role.findAll({
        where: { slug: { [Op.in]: ['admin', 'superadmin', 'super admin'] } }
      });
      const adminRoleIds = adminRoles.map(r => r.id);
      
      const admins = await User.findAll({
        where: { role_id: { [Op.in]: adminRoleIds } }
      });

      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: 'new_user_registered',
        title: 'New User Registered',
        message: `New user ${newUser.username} just registered as a ${roleRecord.name}.`,
        metadata: { new_user_id: newUser.id, role: roleRecord.name }
      }));

      await Notification.bulkCreate(notifications);
    } catch (notifErr) {
      console.error('Failed to create admin notifications:', notifErr);
    }

    const token = generateToken(newUser.id, roleRecord.slug);
    newUser.Role = roleRecord;

    return { token, user: safeUser(newUser) };
  } catch (err) {
    if (!err.status) await transaction.rollback();
    throw err;
  }
};

const loginUser = async (email, password) => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, attributes: ['slug'] }]
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  if (user.is_deleted) {
    const error = new Error('Account has been permanently deleted.');
    error.status = 403;
    throw error;
  }

  if (user.is_active === false) {
    if (user.deactivated_by_admin) {
      const error = new Error('Account disabled by an administrator.');
      error.status = 403;
      throw error;
    }

    if (user.Role?.slug === 'listener' || user.Role?.slug === 'artist') {
      await user.update({ is_active: true });
    } else {
      const error = new Error('Account disabled. Please contact an administrator.');
      error.status = 403;
      throw error;
    }
  }

  const token = generateToken(user.id, user.Role.slug);
  return { token, user: safeUser(user) };
};

const logoutUser = async (token, userId) => {
  const decoded = jwt.decode(token);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await TokenBlacklist.create({
    token_hash: tokenHash,
    user_id: userId,
    expires_at: expiresAt
  });
};

const changeUserPassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid old password.');
    error.status = 401;
    throw error;
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  user.password_hash = password_hash;
  user.must_change_password = false;
  await user.save();
};

module.exports = {
  safeUser,
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  changeUserPassword,
  forgotPassword,
  resetPassword,
  sendResetEmail,
  updateUserProfile,
  deactivateAccount,
  deleteAccount
};
