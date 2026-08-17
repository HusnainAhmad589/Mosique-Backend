'use strict';

const bcrypt = require('bcryptjs');
const { User, Role } = require('../../models');

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

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Incorrect password.');
    error.status = 401;
    throw error;
  }

  await user.update({ is_deleted: true, is_active: false });
  return true;
};

module.exports = {
  safeUser,
  getUserProfile,
  updateUserProfile,
  deactivateAccount,
  deleteAccount,
};
