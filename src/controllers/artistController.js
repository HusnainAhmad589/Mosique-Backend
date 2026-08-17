'use strict';

const { Album, Song, Category, ListeningHistory, FavoriteSong } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { deleteMediaFile } = require('../services/mediaCleanupService');
const contentLifecycleService = require('../services/contentLifecycleService');
const artistProfileController = require('./artist/artistProfileController');
const artistAlbumController = require('./artist/artistAlbumController');

// --- SONGS ---

exports.getSongs = async (req, res) => {
  try {
    const songs = await Song.findAll({
      where: { artist_id: req.user.id },
      include: [
        { model: Album, attributes: ['id', 'title'] },
        { model: Category, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.status(200).json({ success: true, songs });
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.publishSong = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    const { title, category_id, album_id, duration, lyrics, track_number, status } = req.body;
    
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Invalid category.' });
    }

    if (album_id) {
      const album = await Album.findOne({ where: { id: album_id, artist_id: req.user.id } });
      if (!album) {
        return res.status(404).json({ success: false, message: 'Invalid album or access denied.' });
      }
    }

    const audio_url = `/uploads/audio/${req.file.filename}`;
    const initialStatus = ['draft', 'pending_review', 'published'].includes(status) ? status : 'draft';

    const song = await Song.create({
      artist_id: req.user.id,
      album_id: album_id || null,
      category_id,
      title,
      duration: duration || 0,
      audio_url,
      lyrics,
      track_number,
      status: initialStatus
    });

    res.status(201).json({ success: true, message: 'Song published successfully', song });
  } catch (error) {
    console.error('Error publishing song:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateSongStatus = async (req, res) => {
  try {
    const { status, scheduled_at } = req.body;
    
    const song = await Song.findOne({ where: { id: req.params.id, artist_id: req.user.id } });
    
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found or access denied.' });
    }

    const updatedSong = await contentLifecycleService.transitionStatus(song, status, req.user, { scheduled_at });

    res.status(200).json({ success: true, message: `Song status updated to ${status}.`, song: updatedSong });
  } catch (error) {
    console.error('Error updating song status:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.getContentByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status query parameter is required' });
    }

    const songs = await Song.findAll({
      where: { artist_id: req.user.id, status },
      include: [
        { model: Album, attributes: ['id', 'title'] },
        { model: Category, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const albums = await Album.findAll({
      where: { artist_id: req.user.id, status },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ success: true, songs, albums });
  } catch (error) {
    console.error('Error fetching content by status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getArtistStats = async (req, res) => {
  try {
    const artistSongs = await Song.findAll({
      where: { artist_id: req.user.id },
      attributes: ['id', 'title', 'play_count', 'likes_count', 'status']
    });

    const songIds = artistSongs.map(s => s.id);
    const totalStreams = artistSongs.reduce((sum, song) => sum + (song.play_count || 0), 0);

    let monthlyListeners = 0;
    if (songIds.length > 0) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const listenerRecords = await ListeningHistory.findAll({
        where: {
          song_id: songIds,
          played_at: { [Op.gte]: thirtyDaysAgo }
        },
        attributes: ['user_id'],
        group: ['user_id']
      });
      monthlyListeners = listenerRecords.length;
    }

    let topTrack = 'No tracks yet';
    if (artistSongs.length > 0) {
      const sorted = [...artistSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
      topTrack = sorted[0].title;
    }

    let totalLikes = 0;
    if (songIds.length > 0) {
      totalLikes = await FavoriteSong.count({
        where: { song_id: songIds }
      });
    }

    const publishedSongs = artistSongs.filter(s => s.status === 'published').length;
    const totalAlbums = await Album.count({ where: { artist_id: req.user.id } });

    return res.status(200).json({
      success: true,
      stats: {
        total_streams: totalStreams,
        monthly_listeners: monthlyListeners,
        top_track: topTrack,
        total_likes: totalLikes,
        published_songs: publishedSongs,
        total_albums: totalAlbums
      }
    });
  } catch (err) {
    console.error('Artist getStats error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.deleteSong = async (req, res) => {
  try {
    const song = await Song.findOne({
      where: { id: req.params.id, artist_id: req.user.id }
    });

    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found or access denied.' });
    }

    if (song.audio_url) {
      deleteMediaFile(song.audio_url);
    }

    await song.destroy();

    res.status(200).json({ success: true, message: 'Song deleted successfully.' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Profile Exports
exports.getProfile = artistProfileController.getProfile;
exports.updateProfile = artistProfileController.updateProfile;

// Album Exports
exports.getAlbums = artistAlbumController.getAlbums;
exports.createAlbum = artistAlbumController.createAlbum;
exports.updateAlbumStatus = artistAlbumController.updateAlbumStatus;
exports.deleteAlbum = artistAlbumController.deleteAlbum;
