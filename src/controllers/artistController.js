const { ArtistProfile, Album, Song, Category } = require('../models');
const { validationResult } = require('express-validator');

// --- ARTIST PROFILE ---

exports.getProfile = async (req, res) => {
  try {
    let profile = await ArtistProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) {
      // Create empty profile if it doesn't exist yet
      profile = await ArtistProfile.create({ user_id: req.user.id });
    }
    res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { bio, twitter_url, instagram_url, spotify_url } = req.body;
    let profile = await ArtistProfile.findOne({ where: { user_id: req.user.id } });
    
    if (!profile) {
      profile = await ArtistProfile.create({ user_id: req.user.id });
    }

    // If a banner image was uploaded, save its URL path
    const banner_url = req.file ? `/uploads/artwork/${req.file.filename}` : profile.banner_url;

    await profile.update({
      bio,
      twitter_url,
      instagram_url,
      spotify_url,
      banner_url
    });

    res.status(200).json({ success: true, message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error('Error updating artist profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// --- ALBUMS ---

exports.getAlbums = async (req, res) => {
  try {
    const albums = await Album.findAll({
      where: { artist_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.status(200).json({ success: true, albums });
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createAlbum = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { title, description, release_date, status } = req.body;
    
    const cover_url = req.file ? `/uploads/artwork/${req.file.filename}` : null;

    const album = await Album.create({
      artist_id: req.user.id,
      title,
      description,
      release_date,
      status: status || 'draft',
      cover_url
    });

    res.status(201).json({ success: true, message: 'Album created successfully', album });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


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
    
    // Check if category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Invalid category.' });
    }

    // Optional: check if album exists and belongs to artist
    if (album_id) {
      const album = await Album.findOne({ where: { id: album_id, artist_id: req.user.id } });
      if (!album) {
        return res.status(404).json({ success: false, message: 'Invalid album or access denied.' });
      }
    }

    const audio_url = `/uploads/audio/${req.file.filename}`;

    const song = await Song.create({
      artist_id: req.user.id,
      album_id: album_id || null,
      category_id,
      title,
      duration: duration || 0, // frontend handles this or defaulting to 0
      audio_url,
      lyrics,
      track_number,
      status: status || 'draft'
    });

    res.status(201).json({ success: true, message: 'Song published successfully', song });
  } catch (error) {
    console.error('Error publishing song:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

//  GET /api/artist/stats
//  Requires: artist
exports.getArtistStats = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      stats: {
        total_streams: 15420,
        monthly_listeners: 324,
        top_track: "Ocean Waves",
      }
    });
  } catch (err) {
    console.error('Artist getStats error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
