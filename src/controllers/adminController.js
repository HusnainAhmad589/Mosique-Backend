const adminService = require('../services/adminService');

const getStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


//  GET /api/admin/users
//  Requires: admin or superAdmin

const getAllUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error('Admin getAllUsers error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

//  PUT /api/admin/users/:id/role
//  Requires: superAdmin

const updateUserRole = async (req, res) => {
  const userId = req.params.id;
  const { roleSlug } = req.body; // e.g. "admin", "moderator", "artist"

  if (!roleSlug) {
    return res.status(400).json({ success: false, message: 'roleSlug is required.' });
  }

  try {
    const { newRoleName } = await adminService.updateUserRole(req.user.id, userId, roleSlug);

    return res.status(200).json({
      success: true,
      message: `User ${userId} successfully promoted/demoted to ${newRoleName}.`,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Admin updateUserRole error:', err);
    return res.status(status).json({ success: false, message });
  }
};


//  PUT /api/admin/users/:id/status
//  Requires: admin
const updateUserStatus = async (req, res) => {
  const userId = req.params.id;
  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(400).json({ success: false, message: 'is_active is required.' });
  }

  try {
    await adminService.toggleUserStatus(req.user.id, userId, is_active);

    return res.status(200).json({
      success: true,
      message: `User status updated to ${is_active ? 'active' : 'inactive'}.`,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal server error.';
    if (!err.status) console.error('Admin updateUserStatus error:', err);
    return res.status(status).json({ success: false, message });
  }
};

module.exports = { getAllUsers, updateUserRole, updateUserStatus, getStats };
