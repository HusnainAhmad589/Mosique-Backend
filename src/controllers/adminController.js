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

const { User, Song, Album, Category } = require('../models');
const fs = require('fs');
const path = require('path');

const verifyUser = async (req, res) => {
  const userId = req.params.id;
  const { is_verified } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await user.update({ is_verified });

    return res.status(200).json({
      success: true,
      message: `User verification status updated to ${is_verified}.`,
    });
  } catch (err) {
    console.error('Admin verifyUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getCatalogSongs = async (req, res) => {
  try {
    const songs = await Song.findAll({
      include: [
        { model: User, as: 'Artist', attributes: ['id', 'username'] },
        { model: Album, attributes: ['id', 'title'] },
        { model: Category, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, songs });
  } catch (err) {
    console.error('Admin getCatalogSongs error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getCatalogAlbums = async (req, res) => {
  try {
    const albums = await Album.findAll({
      include: [
        { model: User, as: 'Artist', attributes: ['id', 'username'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, albums });
  } catch (err) {
    console.error('Admin getCatalogAlbums error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const deleteCatalogSong = async (req, res) => {
  try {
    const song = await Song.findByPk(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });

    if (song.audio_url) {
      const filePath = path.join(__dirname, '../../', song.audio_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await song.destroy();
    res.json({ success: true, message: 'Song deleted successfully.' });
  } catch (err) {
    console.error('Admin deleteCatalogSong error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const deleteCatalogAlbum = async (req, res) => {
  try {
    const album = await Album.findByPk(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    await Song.update({ album_id: null }, { where: { album_id: album.id } });

    if (album.cover_url) {
      const filePath = path.join(__dirname, '../../', album.cover_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await album.destroy();
    res.json({ success: true, message: 'Album deleted successfully.' });
  } catch (err) {
    console.error('Admin deleteCatalogAlbum error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { 
  getAllUsers, 
  updateUserRole, 
  updateUserStatus, 
  getStats,
  verifyUser,
  getCatalogSongs,
  getCatalogAlbums,
  deleteCatalogSong,
  deleteCatalogAlbum
};
