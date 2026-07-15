
const { Song, User, Album, Category, Playlist, PlaylistSong } = require('../models');
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
          attributes: ['id', 'username', 'display_name'],
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
    // Placeholder — in a real app this would insert into a favorites table
    return res.status(200).json({
      success: true,
      message: `Track #${trackId || 'unknown'} added to ${req.user.username}'s favorites! ❤️`,
    });
  } catch (err) {
    console.error('Listener addFavorite error:', err);
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

    // Ensure song exists and is published
    const song = await Song.findOne({ where: { id: songId, status: 'published' }});
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

module.exports = {
  getFeed,
  addFavorite,
  getAlbums,
  getPlaylists,
  addToPlaylist
};
