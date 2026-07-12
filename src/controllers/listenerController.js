
const { Song, User, Album, Category, Playlist, PlaylistSong, FavoriteSong, SavedAlbum } = require('../models');
const { Op } = require('sequelize');

//  GET /api/listener/feed
//  Returns real songs from the database with artist, album, and category info.
//  Supports optional query params: ?search=, ?category=

const getFeed = async (req, res) => {
  try {
    const { search, category, albumId } = req.query;

    const where = {};

    // Optional search filter (by song title)
    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    // Optional category filter
    if (category) {
      where.category_id = category;
    }

    // Optional album filter
    if (albumId) {
      where.album_id = albumId;
    }

    const songs = await Song.findAll({
      where,
      include: [
        {
          model: User,
          as: 'Artist',
          attributes: ['id', 'username', 'display_name', 'avatar_url'],
        },
        {
          model: Album,
          attributes: ['id', 'title', 'cover_url'],
        },
        {
          model: Category,
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const feed = songs.map(song => ({
      id: song.id,
      title: song.title,
      artist_name: song.Artist?.display_name || song.Artist?.username || 'Unknown Artist',
      artist_id: song.Artist?.id,
      artist_profile_picture: song.Artist?.avatar_url || null,
      audio_url: song.audio_url,
      album_title: song.Album?.title || null,
      cover_url: song.Album?.cover_url || null,
      category_name: song.Category?.name || null,
      duration: song.duration,
      play_count: song.play_count,
      created_at: song.created_at,
    }));

    return res.status(200).json({
      success: true,
      message: `Music feed for ${req.user.username}.`,
      feed,
    });
  } catch (err) {
    console.error('Listener getFeed error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

//  POST /api/listener/favorites
//  Requires: listener and above (any logged-in user)

const addFavorite = async (req, res) => {
  const { trackId } = req.body;
  try {
    const [favorite, created] = await FavoriteSong.findOrCreate({
      where: { user_id: req.user.id, song_id: trackId }
    });
    if (!created) {
      return res.status(400).json({ success: false, message: 'Song already in favorites' });
    }
    return res.status(200).json({ success: true, message: `Added to favorites!` });
  } catch (err) {
    console.error('Listener addFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const removeFavorite = async (req, res) => {
  const { id } = req.params;
  try {
    await FavoriteSong.destroy({ where: { user_id: req.user.id, song_id: id } });
    return res.status(200).json({ success: true, message: 'Removed from favorites' });
  } catch (err) {
    console.error('Listener removeFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getFavorites = async (req, res) => {
  try {
    const favorites = await FavoriteSong.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Song,
        include: [
          { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
          { model: Album, attributes: ['id', 'title', 'cover_url'] },
          { model: Category, attributes: ['id', 'name'] },
        ]
      }],
      order: [['created_at', 'DESC']]
    });

    const feed = favorites.map(f => {
      const song = f.Song;
      if (!song) return null;
      return {
        id: song.id,
        title: song.title,
        artist_name: song.Artist?.display_name || song.Artist?.username || 'Unknown Artist',
        artist_id: song.Artist?.id,
        artist_profile_picture: song.Artist?.avatar_url || null,
        audio_url: song.audio_url,
        album_title: song.Album?.title || null,
        cover_url: song.Album?.cover_url || null,
        category_name: song.Category?.name || null,
        duration: song.duration,
        play_count: song.play_count,
        created_at: song.created_at,
      }
    }).filter(s => s !== null);

    return res.status(200).json({ success: true, favorites: feed });
  } catch (err) {
    console.error('Listener getFavorites error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const saveAlbum = async (req, res) => {
  const { albumId } = req.body;
  try {
    const [saved, created] = await SavedAlbum.findOrCreate({
      where: { user_id: req.user.id, album_id: albumId }
    });
    if (!created) {
      return res.status(400).json({ success: false, message: 'Album already saved' });
    }
    return res.status(200).json({ success: true, message: `Album saved!` });
  } catch (err) {
    console.error('Listener saveAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const removeSavedAlbum = async (req, res) => {
  const { id } = req.params;
  try {
    await SavedAlbum.destroy({ where: { user_id: req.user.id, album_id: id } });
    return res.status(200).json({ success: true, message: 'Removed from saved albums' });
  } catch (err) {
    console.error('Listener removeSavedAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getSavedAlbums = async (req, res) => {
  try {
    const saved = await SavedAlbum.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Album,
        include: [{ model: User, as: 'Artist', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
      }],
      order: [['created_at', 'DESC']]
    });

    const albums = saved.map(s => {
      const album = s.Album;
      if (!album) return null;
      return {
        id: album.id,
        title: album.title,
        description: album.description,
        cover_url: album.cover_url,
        release_date: album.release_date,
        artist_name: album.Artist?.display_name || album.Artist?.username || 'Unknown',
        artist_id: album.Artist?.id,
        artist_avatar: album.Artist?.avatar_url
      }
    }).filter(a => a !== null);

    return res.status(200).json({ success: true, albums });
  } catch (err) {
    console.error('Listener getSavedAlbums error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

//  GET /api/listener/albums
//  Returns all published albums with their artist info.

const getAlbums = async (req, res) => {
  try {
    const albums = await Album.findAll({
      where: { status: 'published' },
      include: [
        {
          model: User,
          as: 'Artist',
          attributes: ['id', 'username', 'display_name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const formattedAlbums = albums.map(album => ({
      id: album.id,
      title: album.title,
      cover_url: album.cover_url,
      release_date: album.release_date,
      artist_name: album.Artist?.display_name || album.Artist?.username || 'Unknown Artist',
      artist_id: album.Artist?.id,
      created_at: album.created_at,
    }));

    return res.status(200).json({
      success: true,
      albums: formattedAlbums,
    });
  } catch (err) {
    console.error('Listener getAlbums error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// --- PLAYLISTS ---

// GET /api/listener/playlists
const getPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Song,
          as: 'Songs',
          include: [
            {
              model: User,
              as: 'Artist',
              attributes: ['id', 'username', 'display_name'],
            },
            {
              model: Category,
              attributes: ['name'],
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedPlaylists = playlists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      created_at: playlist.created_at,
      songs: playlist.Songs.map(song => ({
        id: song.id,
        title: song.title,
        description: song.description,
        audio_url: song.audio_url,
        cover_url: song.cover_url,
        release_date: song.release_date,
        artist_name: song.Artist?.display_name || song.Artist?.username || 'Unknown Artist',
        artist_id: song.Artist?.id,
        category_name: song.Category?.name || 'Uncategorized',
      }))
    }));

    return res.status(200).json({ success: true, playlists: formattedPlaylists });
  } catch (err) {
    console.error('getPlaylists error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/listener/playlists
// Body: { name, songId }
const addToPlaylist = async (req, res) => {
  try {
    const { name, songId } = req.body;
    
    if (!name || !songId) {
      return res.status(400).json({ success: false, message: 'Playlist name and song ID are required.' });
    }

    // Ensure song exists
    const song = await Song.findOne({ where: { id: songId }});
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    // Find or create the playlist
    const [playlist] = await Playlist.findOrCreate({
      where: { user_id: req.user.id, name: name.trim() }
    });

    // Check if song is already in the playlist
    const existingEntry = await PlaylistSong.findOne({
      where: { playlist_id: playlist.id, song_id: songId }
    });

    if (!existingEntry) {
      await PlaylistSong.create({
        playlist_id: playlist.id,
        song_id: songId
      });
    }

    return res.status(200).json({ success: true, message: `Added to ${playlist.name}`, playlist });
  } catch (err) {
    console.error('addToPlaylist error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/listener/playlists/:id
const deletePlaylist = async (req, res) => {
  try {
    const playlistId = req.params.id;
    const playlist = await Playlist.findOne({ where: { id: playlistId, user_id: req.user.id } });
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
    }

    // Delete associated PlaylistSongs first
    await PlaylistSong.destroy({ where: { playlist_id: playlistId } });
    
    // Delete the playlist itself
    await playlist.destroy();

    return res.status(200).json({ success: true, message: 'Playlist deleted successfully.' });
  } catch (err) {
    console.error('deletePlaylist error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getFeed,
  getAlbums,
  getPlaylists,
  addToPlaylist,
  deletePlaylist,
  addFavorite,
  removeFavorite,
  getFavorites,
  saveAlbum,
  removeSavedAlbum,
  getSavedAlbums
};
