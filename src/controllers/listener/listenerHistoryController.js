'use strict';

const { ListeningHistory, Song, User, Album, Category } = require('../../models');

const recordListen = async (req, res) => {
  const { trackId } = req.body;
  try {
    if (!trackId) {
      return res.status(400).json({ success: false, message: 'Track ID is required.' });
    }
    const song = await Song.findByPk(trackId);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    await ListeningHistory.create({
      user_id: req.user.id,
      song_id: trackId,
      played_at: new Date(),
    });

    await song.increment('play_count', { by: 1 });

    return res.status(200).json({
      success: true,
      message: 'Listen recorded successfully.',
    });
  } catch (err) {
    console.error('Listener recordListen error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getHistory = async (req, res) => {
  try {
    const historyRecords = await ListeningHistory.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Song,
          as: 'Song',
          include: [
            { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name'] },
            { model: Album, attributes: ['id', 'title', 'cover_url'] },
            { model: Category, attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['played_at', 'DESC']],
      limit: 50,
    });

    const history = historyRecords
      .filter(rec => rec.Song)
      .map(rec => ({
        history_id: rec.id,
        played_at: rec.played_at,
        song: {
          id: rec.Song.id,
          title: rec.Song.title,
          artist_name: rec.Song.Artist?.display_name || rec.Song.Artist?.username || 'Unknown Artist',
          artist_id: rec.Song.Artist?.id,
          audio_url: rec.Song.audio_url,
          album_title: rec.Song.Album?.title || null,
          cover_url: rec.Song.Album?.cover_url || null,
          category_name: rec.Song.Category?.name || null,
          duration: rec.Song.duration,
        },
      }));

    return res.status(200).json({ success: true, history });
  } catch (err) {
    console.error('Listener getHistory error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const clearHistory = async (req, res) => {
  try {
    await ListeningHistory.destroy({
      where: { user_id: req.user.id },
    });
    return res.status(200).json({
      success: true,
      message: 'Listening history cleared.',
    });
  } catch (err) {
    console.error('Listener clearHistory error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  recordListen,
  getHistory,
  clearHistory,
};
