'use strict';

const { Song } = require('../../models');
const { addLyricsJob } = require('../../queues/lyricsQueue');

/**
 * Trigger AI Lyric Generation for an artist's track via BullMQ background queue
 */
exports.generateLyrics = async (req, res) => {
  try {
    const song = await Song.findOne({
      where: { id: req.params.id, artist_id: req.user.id }
    });

    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found or access denied.' });
    }

    if (!song.audio_url) {
      return res.status(400).json({ success: false, message: 'Song has no audio file to transcribe.' });
    }

    // Set song status to processing and clear previous errors
    song.lyrics_status = 'processing';
    song.lyrics_error = null;
    await song.save();

    // Enqueue BullMQ background job for Demucs + faster-whisper processing
    await addLyricsJob(song.id, song.audio_url, song.title);

    return res.status(202).json({
      success: true,
      message: 'Lyrics generation queued in background. Vocals will be separated with Demucs and translated to English.',
      lyrics_status: 'processing',
      songId: song.id
    });
  } catch (error) {
    console.error('Error queuing AI lyrics job:', error);
    
    // Attempt status update on failure
    try {
      await Song.update(
        { lyrics_status: 'failed', lyrics_error: error.message },
        { where: { id: req.params.id } }
      );
    } catch (dbErr) {
      console.error('Failed to set error status on song:', dbErr);
    }

    return res.status(500).json({ success: false, message: 'Failed to queue AI lyrics generation.' });
  }
};

/**
 * Get current lyrics status and results for a track
 */
exports.getLyricsStatus = async (req, res) => {
  try {
    const song = await Song.findOne({
      where: { id: req.params.id, artist_id: req.user.id },
      attributes: ['id', 'title', 'lyrics', 'lyrics_status', 'lyrics_error']
    });

    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found or access denied.' });
    }

    let parsedLyrics = null;
    if (song.lyrics) {
      try {
        parsedLyrics = typeof song.lyrics === 'string' ? JSON.parse(song.lyrics) : song.lyrics;
      } catch (e) {
        parsedLyrics = song.lyrics;
      }
    }

    return res.status(200).json({
      success: true,
      songId: song.id,
      lyrics_status: song.lyrics_status || 'idle',
      lyrics_error: song.lyrics_error || null,
      lyrics: parsedLyrics
    });
  } catch (error) {
    console.error('Error getting lyrics status:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve lyrics status.' });
  }
};

/**
 * Manually update/edit lyrics for an artist's track
 */
exports.updateLyrics = async (req, res) => {
  try {
    const { lyrics } = req.body;
    const song = await Song.findOne({
      where: { id: req.params.id, artist_id: req.user.id }
    });

    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found or access denied.' });
    }

    let lyricsValue = lyrics;
    if (typeof lyrics === 'object') {
      lyricsValue = JSON.stringify(lyrics);
    }

    song.lyrics = lyricsValue;
    song.lyrics_status = 'completed';
    song.lyrics_error = null;
    await song.save();

    return res.status(200).json({
      success: true,
      message: 'Lyrics updated successfully!',
      song
    });
  } catch (error) {
    console.error('Error updating lyrics:', error);
    return res.status(500).json({ success: false, message: 'Failed to update lyrics.' });
  }
};
