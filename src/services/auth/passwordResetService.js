'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { User } = require('../../models');
const { Op } = require('sequelize');

const sendResetEmail = async (email, token) => {
  let transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: false,
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

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

  const info = await transporter.sendMail({
    from: '"Mosique App" <noreply@mosique.com>',
    to: email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
    html: `<p>You requested a password reset. Please click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  console.log('Reset email sent: %s', info.messageId);
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
        [Op.gt]: new Date()
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

module.exports = {
  sendResetEmail,
  forgotPassword,
  resetPassword,
};
