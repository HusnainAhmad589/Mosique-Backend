const { Song, User, Album, Category, Playlist, PlaylistSong, FavoriteSong, SavedAlbum, ListeningHistory, ArtistFollow, ArtistProfile } = require('../models');
const { Op } = require('sequelize');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');
const { checkAndPublishScheduledContent } = require('../services/schedulerService');

// GET /api/listener/feed
// Returns real songs from the database with artist, album, and category info.
const getFeed = async (req, res) => {
  try {
    // Run scheduled content check asynchronously
    checkAndPublishScheduledContent().catch(err => console.error(err));

    const { search, category, albumId, sortBy } = req.query;
    const { limit, offset, page } = getPagination(req, 20);

    const where = {};

    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    if (category) {
      where.category_id = category;
    }

    if (albumId) {
      where.album_id = albumId;
    }

    // Determine sort order
    let order = [['created_at', 'DESC']];
    if (sortBy === 'popular') {
      order = [['play_count', 'DESC']];
    } else if (sortBy === 'title') {
      order = [['title', 'ASC']];
    } else if (sortBy === 'oldest') {
      order = [['created_at', 'ASC']];
    }

    const { count, rows: songs } = await Song.findAndCountAll({
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
      order,
      limit,
      offset,
      distinct: true
    });

    const items = songs.map(song => ({
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

    const paginated = formatPaginatedResponse(items, count, page, limit);

    return res.status(200).json({
      success: true,
      message: `Music feed for ${req.user.username}.`,
      feed: paginated.items,
      pagination: paginated.pagination
    });
  } catch (err) {
    console.error('Listener getFeed error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/listener/favorites
const addFavorite = async (req, res) => {
  const { trackId } = req.body;
  try {
    if (!trackId) {
      return res.status(400).json({ success: false, message: 'Track ID is required.' });
    }
    const song = await Song.findByPk(trackId);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }
    await FavoriteSong.findOrCreate({
      where: { user_id: req.user.id, song_id: trackId }
    });
    return res.status(200).json({
      success: true,
      message: `Track "${song.title}" added to favorites! ❤️`,
    });
  } catch (err) {
    console.error('Listener addFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/listener/favorites
const getFavorites = async (req, res) => {
  try {
    const favorites = await FavoriteSong.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Song,
          include: [
            { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name'] },
            { model: Album, attributes: ['id', 'title', 'cover_url'] },
            { model: Category, attributes: ['id', 'name'] },
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = favorites.map(fav => {
      const song = fav.Song;
      if (!song) return null;
      return {
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
      };
    }).filter(Boolean);

    return res.status(200).json({ success: true, favorites: formatted });
  } catch (err) {
    console.error('getFavorites error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/listener/favorites/:id
const removeFavorite = async (req, res) => {
  try {
    const songId = req.params.id;
    await FavoriteSong.destroy({
      where: { user_id: req.user.id, song_id: songId }
    });
    return res.status(200).json({ success: true, message: 'Removed from favorites.' });
  } catch (err) {
    console.error('removeFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/listener/albums
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

// POST /api/listener/play/:id
const recordPlay = async (req, res) => {
  try {
    const songId = req.params.id;
    const song = await Song.findByPk(songId);
    if (song) {
      song.play_count = (song.play_count || 0) + 1;
      await song.save();

      if (req.user?.id) {
        await ListeningHistory.create({
          user_id: req.user.id,
          song_id: song.id,
          played_at: new Date()
        });
      }
    }
    return res.status(200).json({ success: true, message: 'Play recorded.' });
  } catch (err) {
    console.error('recordPlay error:', err);
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
const addToPlaylist = async (req, res) => {
  try {
    const { name, songId } = req.body;

    if (!name || !songId) {
      return res.status(400).json({ success: false, message: 'Playlist name and song ID are required.' });
    }

    const song = await Song.findOne({ where: { id: songId, status: 'published' } });
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    const [playlist] = await Playlist.findOrCreate({
      where: { user_id: req.user.id, name: name.trim() }
    });

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
    const playlist = await Playlist.findOne({
      where: { id: playlistId, user_id: req.user.id }
    });
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }
    await PlaylistSong.destroy({ where: { playlist_id: playlist.id } });
    await playlist.destroy();
    return res.status(200).json({ success: true, message: 'Playlist deleted.' });
  } catch (err) {
    console.error('deletePlaylist error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// --- SAVED ALBUMS ---

// GET /api/listener/saved-albums
const getSavedAlbums = async (req, res) => {
  try {
    const saved = await SavedAlbum.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Album,
          include: [
            { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name'] }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const albums = saved.map(item => {
      const album = item.Album;
      if (!album) return null;
      return {
        id: album.id,
        title: album.title,
        cover_url: album.cover_url,
        release_date: album.release_date,
        artist_name: album.Artist?.display_name || album.Artist?.username || 'Unknown Artist',
        artist_id: album.Artist?.id,
        created_at: album.created_at,
      };
    }).filter(Boolean);

    return res.status(200).json({ success: true, albums });
  } catch (err) {
    console.error('getSavedAlbums error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/listener/saved-albums
const saveAlbum = async (req, res) => {
  try {
    const { albumId } = req.body;
    if (!albumId) {
      return res.status(400).json({ success: false, message: 'Album ID is required.' });
    }
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found.' });
    }
    await SavedAlbum.findOrCreate({
      where: { user_id: req.user.id, album_id: albumId }
    });
    return res.status(200).json({ success: true, message: `Album "${album.title}" saved!` });
  } catch (err) {
    console.error('saveAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/listener/saved-albums/:id
const removeSavedAlbum = async (req, res) => {
  try {
    const albumId = req.params.id;
    await SavedAlbum.destroy({
      where: { user_id: req.user.id, album_id: albumId }
    });
    return res.status(200).json({ success: true, message: 'Album removed from saved.' });
  } catch (err) {
    console.error('removeSavedAlbum error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// --- FOLLOWING ARTISTS ---

// GET /api/listener/following
const getFollowing = async (req, res) => {
  try {
    const follows = await ArtistFollow.findAll({
      where: { follower_id: req.user.id },
      include: [
        {
          model: User,
          as: 'Artist',
          attributes: ['id', 'username', 'display_name'],
          include: [
            { model: ArtistProfile, attributes: ['banner_url'] }
          ]
        }
      ]
    });

    const following = follows.map(f => {
      const artist = f.Artist;
      if (!artist) return null;
      return {
        id: artist.id,
        name: artist.display_name || artist.username,
        username: artist.username,
        profilePicture: artist.ArtistProfile?.banner_url || null,
      };
    }).filter(Boolean);

    return res.status(200).json({ success: true, following });
  } catch (err) {
    console.error('getFollowing error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/listener/following/:artistId
const followArtist = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    if (parseInt(artistId, 10) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }
    const artistUser = await User.findByPk(artistId);
    if (!artistUser) {
      return res.status(404).json({ success: false, message: 'Artist not found.' });
    }
    await ArtistFollow.findOrCreate({
      where: { follower_id: req.user.id, artist_id: artistId }
    });
    return res.status(200).json({ success: true, message: `Now following ${artistUser.display_name || artistUser.username}!` });
  } catch (err) {
    console.error('followArtist error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/listener/following/:artistId
const unfollowArtist = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    await ArtistFollow.destroy({
      where: { follower_id: req.user.id, artist_id: artistId }
    });
    return res.status(200).json({ success: true, message: 'Unfollowed artist.' });
  } catch (err) {
    console.error('unfollowArtist error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// --- ARTIST DETAILS ---

// GET /api/listener/artist/:artistId
const getArtistDetails = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const artistUser = await User.findByPk(artistId, {
      attributes: ['id', 'username', 'display_name', 'created_at'],
      include: [
        { model: ArtistProfile }
      ]
    });

    if (!artistUser) {
      return res.status(404).json({ success: false, message: 'Artist not found.' });
    }

    const followerCount = await ArtistFollow.count({ where: { artist_id: artistId } });
    const songs = await Song.findAll({
      where: { artist_id: artistId, status: 'published' },
      include: [
        { model: Album, attributes: ['id', 'title', 'cover_url'] },
        { model: Category, attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const albums = await Album.findAll({
      where: { artist_id: artistId, status: 'published' },
      order: [['created_at', 'DESC']]
    });

    const profile = artistUser.ArtistProfile || {};

    const formattedArtist = {
      id: artistUser.id,
      username: artistUser.username,
      display_name: artistUser.display_name,
      joined: artistUser.created_at,
      bio: profile.bio || '',
      banner_url: profile.banner_url || null,
      twitter_url: profile.twitter_url || null,
      instagram_url: profile.instagram_url || null,
      spotify_url: profile.spotify_url || null,
      follower_count: followerCount,
      song_count: songs.length,
      album_count: albums.length,
      songs: songs.map(s => ({
        id: s.id,
        title: s.title,
        audio_url: s.audio_url,
        cover_url: s.Album?.cover_url || null,
        album_title: s.Album?.title || null,
        category_name: s.Category?.name || '',
      })),
      albums: albums.map(a => ({
        id: a.id,
        title: a.title,
        cover_url: a.cover_url,
        release_date: a.release_date,
      }))
    };

    return res.status(200).json({ success: true, artist: formattedArtist });
  } catch (err) {
    console.error('getArtistDetails error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// --- LISTENING HISTORY ---

// GET /api/listener/history
const getHistory = async (req, res) => {
  try {
    const historyEntries = await ListeningHistory.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Song,
          as: 'Song',
          include: [
            { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name'] },
            { model: Album, attributes: ['id', 'title', 'cover_url'] }
          ]
        }
      ],
      order: [['played_at', 'DESC']],
      limit: 50
    });

    const history = historyEntries.map(entry => {
      const song = entry.Song;
      if (!song) return null;
      return {
        history_id: entry.id,
        played_at: entry.played_at,
        song: {
          id: song.id,
          title: song.title,
          audio_url: song.audio_url,
          artist_name: song.Artist?.display_name || song.Artist?.username || 'Unknown Artist',
          cover_url: song.Album?.cover_url || null,
        }
      };
    }).filter(Boolean);

    return res.status(200).json({ success: true, history });
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/listener/history
const addToHistory = async (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId) {
      return res.status(400).json({ success: false, message: 'Song ID is required.' });
    }
    await ListeningHistory.create({
      user_id: req.user.id,
      song_id: songId,
      played_at: new Date()
    });
    return res.status(200).json({ success: true, message: 'Added to listening history.' });
  } catch (err) {
    console.error('addToHistory error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getFeed,
  addFavorite,
  removeFavorite,
  getFavorites,
  getAlbums,
  getPlaylists,
  addToPlaylist,
  deletePlaylist,
  saveAlbum,
  removeSavedAlbum,
  getSavedAlbums,
  followArtist,
  unfollowArtist,
  getFollowing,
  getArtistDetails,
  addToHistory,
  getHistory,
  recordPlay
};
