const { User, Role } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const getAllUsers = async () => {
  const users = await User.findAll({
    include: [{ model: Role, attributes: ['slug'], where: { slug: { [Op.notIn]: ['superadmin', 'admin'] } } }],
    order: [['id', 'DESC']],
    attributes: ['id', 'username', 'email', 'display_name', 'is_active', 'created_at', 'avatar_url', 'address', 'dob', 'postal_code', 'phone_number', 'gender', 'is_verified']
  });

  return users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    display_name: u.display_name,
    is_active: u.is_active,
    role_name: u.Role.slug,
    created_at: u.created_at,
    avatar_url: u.avatar_url,
    address: u.address,
    dob: u.dob,
    postal_code: u.postal_code,
    phone_number: u.phone_number,
    gender: u.gender,
    is_verified: u.is_verified
  }));
};

const updateUserRole = async (adminId, targetUserId, roleSlug) => {
  const roleRecord = await Role.findOne({
    where: { slug: roleSlug }
  });

  if (!roleRecord) {
    const error = new Error(`Role '${roleSlug}' not found.`);
    error.status = 404;
    throw error;
  }

  if (parseInt(targetUserId) === adminId) {
    const error = new Error('You cannot change your own role.');
    error.status = 403;
    throw error;
  }

  const [affectedRows] = await User.update(
    { role_id: roleRecord.id },
    { where: { id: targetUserId } }
  );

  if (affectedRows === 0) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  return { newRoleName: roleRecord.name };
};

const toggleUserStatus = async (adminId, targetUserId, isActive) => {
  if (parseInt(targetUserId) === adminId) {
    const error = new Error('You cannot change your own status.');
    error.status = 403;
    throw error;
  }

  const user = await User.findByPk(targetUserId, {
    include: [{ model: Role, attributes: ['slug'] }]
  });

  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  if (user.Role && user.Role.slug === 'superadmin') {
    const error = new Error('Admins cannot toggle super admin status.');
    error.status = 403;
    throw error;
  }

  await user.update({ 
    is_active: isActive,
    deactivated_by_admin: !isActive 
  });
  return user;
};

const getDashboardStats = async () => {
  const users = await User.findAll({
    include: [{ model: Role, attributes: ['slug'] }]
  });

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    listeners: users.filter(u => u.Role?.slug === 'listener').length,
    artists: users.filter(u => u.Role?.slug === 'artist').length,
    moderators: users.filter(u => u.Role?.slug === 'moderator').length
  };

  const recentUsers = await User.findAll({
    include: [{ model: Role, attributes: ['name', 'slug'] }],
    order: [['created_at', 'DESC']],
    limit: 5,
    attributes: ['id', 'username', 'email', 'created_at', 'avatar_url', 'is_active']
  });

  return { ...stats, recentUsers };
};

const createAdminUser = async (username, email, providedPassword = null) => {
  const roleRecord = await Role.findOne({ where: { slug: 'admin' } });
  if (!roleRecord) {
    const error = new Error("Admin role not found in database.");
    error.status = 500;
    throw error;
  }

  // Check if username or email already exists
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }]
    }
  });

  if (existingUser) {
    const error = new Error('Username or Email already in use.');
    error.status = 400;
    throw error;
  }

  const plainPassword = providedPassword || crypto.randomBytes(6).toString('hex'); // 12 chars if auto generated
  const password_hash = await bcrypt.hash(plainPassword, 12);

  const newUser = await User.create({
    username,
    email,
    password_hash,
    display_name: username,
    role_id: roleRecord.id,
    is_active: true,
    must_change_password: true
  });

  // Send email to the new admin
  try {
    await sendAdminWelcomeEmail(email, username, plainPassword);
  } catch (err) {
    console.error("Failed to send admin welcome email:", err);
    // We don't fail the creation process if email fails
  }

  return { user: newUser, plainPassword };
};

const sendAdminWelcomeEmail = async (email, username, password) => {
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

  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const info = await transporter.sendMail({
    from: '"Mosique App" <noreply@mosique.com>',
    to: email,
    subject: 'Welcome to Mosique - Admin Account Details',
    text: `Hello ${username},\n\nYou have been registered as an Admin for Mosique.\n\nUsername: ${username}\nEmail: ${email}\nPassword: ${password}\n\nPlease login at ${loginUrl} and you will be prompted to change your password immediately.`,
    html: `<p>Hello ${username},</p><p>You have been registered as an Admin for Mosique.</p><ul><li><strong>Username:</strong> ${username}</li><li><strong>Email:</strong> ${email}</li><li><strong>Password:</strong> ${password}</li></ul><p>Please login at <a href="${loginUrl}">${loginUrl}</a>. You will be prompted to change your password immediately.</p>`,
  });

  console.log('Welcome email sent: %s', info.messageId);
  if (process.env.SMTP_HOST === 'smtp.ethereal.email' || !process.env.SMTP_HOST) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  getDashboardStats,
  createAdminUser
};
