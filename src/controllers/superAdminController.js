const { User, Role } = require('../models');
const adminService = require('../services/adminService');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_deleted: false },
      attributes: ['id', 'username', 'email', 'display_name', 'is_active', 'created_at', 'avatar_url', 'address', 'dob', 'postal_code', 'phone_number', 'gender', 'is_verified'],
      include: [{ model: Role, attributes: ['id', 'name', 'slug'] }]
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const role = await Role.findByPk(role_id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    await user.update({ role_id: role.id });
    res.json({ success: true, message: 'User role updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json({ success: true, roles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ 
      is_active,
      deactivated_by_admin: !is_active 
    });
    res.json({ success: true, message: `User status updated to ${is_active ? 'active' : 'inactive'}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Username and email are required.' });
    }

    const { user, plainPassword } = await adminService.createAdminUser(username, email, password);
    res.json({ success: true, user, password: plainPassword, message: 'Admin created successfully.' });
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Server error';
    if (!err.status) console.error(err);
    res.status(status).json({ success: false, message });
  }
};

exports.batchDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs are required.' });
    }

    await User.update({ is_deleted: true }, {
      where: {
        id: userIds
      }
    });

    res.json({ success: true, message: 'Users successfully deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

