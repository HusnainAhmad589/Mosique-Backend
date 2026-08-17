'use strict';

const { Song, User, Album, Category, FavoriteSong } = require('../../models');

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
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const items = favorites
      .filter(fav => fav.Song)
      .map(fav => ({
        id: fav.Song.id,
        title: fav.Song.title,
        artist_name: fav.Song.Artist?.display_name || fav.Song.Artist?.username || 'Unknown Artist',
        artist_id: fav.Song.Artist?.id,
        audio_url: fav.Song.audio_url,
        album_title: fav.Song.Album?.title || null,
        cover_url: fav.Song.Album?.cover_url || null,
        category_name: fav.Song.Category?.name || null,
        duration: fav.Song.duration,
        liked_at: fav.created_at,
      }));

    return res.status(200).json({ success: true, favorites: items });
  } catch (err) {
    console.error('Listener getFavorites error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const removeFavorite = async (req, res) => {
  const { trackId } = req.params;
  try {
    const deleted = await FavoriteSong.destroy({
      where: { user_id: req.user.id, song_id: trackId },
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Favorite not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Track removed from favorites.',
    });
  } catch (err) {
    console.error('Listener removeFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  addFavorite,
  getFavorites,
  removeFavorite,
};
