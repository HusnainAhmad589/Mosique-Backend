const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { User, Role, TokenBlacklist, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { hashToken } = require('../middleware/authMiddleware');

const safeUser = (user) => ({
  id:           user.id,
  username:     user.username,
  email:        user.email,
  display_name: user.display_name,
  role:         user.Role ? user.Role.slug : user.role_name, 
  created_at:   user.created_at,
  avatar_url:   user.avatar_url,
  address:      user.address,
  dob:          user.dob,
  postal_code:  user.postal_code,
  phone_number: user.phone_number,
  gender:       user.gender,
  must_change_password: user.must_change_password,
});

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
        [require('sequelize').Op.or]: [{ email }, { username }]
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

    // After commit, notify admins and superadmins
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

  // 1. Check password first
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  // 2. Check if permanently deleted
  if (user.is_deleted) {
    const error = new Error('Account has been permanently deleted.');
    error.status = 403;
    throw error;
  }

  // 3. Handle inactive accounts
  if (user.is_active === false) {
    if (user.deactivated_by_admin) {
      const error = new Error('Account disabled by an administrator.');
      error.status = 403;
      throw error;
    }

    // Only listeners and artists can self-reactivate
    if (user.Role?.slug === 'listener' || user.Role?.slug === 'artist') {
      await user.update({ is_active: true });
    } else {
      // Admins cannot self-reactivate (must be unbanned by superadmin)
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

const getUserProfile = async (userId) => {
  const user = await User.findOne({
    where: { id: userId },
    include: [{ model: Role, attributes: ['slug'] }]
  });

  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  return safeUser(user);
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

const sendResetEmail = async (email, token) => {
  let transporter;
  
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // use STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate a test account dynamically if no credentials provided
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

  const info = await transporter.sendMail({
    from: '"Mosique App" <noreply@mosique.com>',
    to: email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
    html: `<p>You requested a password reset. Please click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  console.log('Message sent: %s', info.messageId);
  if (process.env.SMTP_HOST === 'smtp.ethereal.email' || !process.env.SMTP_HOST) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return; // Do not reveal if user exists
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.reset_password_token = hashedToken;
  user.reset_password_expires = Date.now() + 3600000; // 1 hour
  await user.save();

  await sendResetEmail(user.email, resetToken);
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    where: {
      reset_password_token: hashedToken,
      reset_password_expires: {
        [require('sequelize').Op.gt]: new Date()
      }
    }
  });

  if (!user) {
    const error = new Error('Invalid or expired password reset token.');
    error.status = 400;
    throw error;
  }

  user.password_hash = await bcrypt.hash(newPassword, 12);
  user.reset_password_token = null;
  user.reset_password_expires = null;
  await user.save();
};

const updateUserProfile = async (userId, data) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, attributes: ['slug'] }]
  });
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  if (data.display_name !== undefined) user.display_name = data.display_name;
  if (data.avatar_url !== undefined) user.avatar_url = data.avatar_url;
  if (data.address !== undefined) user.address = data.address;
  if (data.dob !== undefined) user.dob = data.dob || null;
  if (data.postal_code !== undefined) user.postal_code = data.postal_code;
  if (data.phone_number !== undefined) user.phone_number = data.phone_number;
  if (data.gender !== undefined) user.gender = data.gender;

  await user.save();
  return safeUser(user);
};

const deactivateAccount = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, attributes: ['slug'] }]
  });

  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const role = user.Role?.slug;
  if (role !== 'listener' && role !== 'artist') {
    const error = new Error('Only listeners and artists can deactivate their own accounts.');
    error.status = 403;
    throw error;
  }

  await user.update({ is_active: false });
  return true;
};

const deleteAccount = async (userId, password) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, attributes: ['slug'] }]
  });

  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const role = user.Role?.slug;
  if (role !== 'listener' && role !== 'artist') {
    const error = new Error('Only listeners and artists can delete their own accounts.');
    error.status = 403;
    throw error;
  }

  if (!password) {
    const error = new Error('Password is required to delete your account.');
    error.status = 400;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Incorrect password.');
    error.status = 401;
    throw error;
  }

  await user.update({ is_deleted: true, is_active: false });
  return true;
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  changeUserPassword,
  forgotPassword,
  resetPassword,
  updateUserProfile,
  deactivateAccount,
  deleteAccount
};
