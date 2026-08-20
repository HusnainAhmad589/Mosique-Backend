const { Song, Album, User, Category, Report, ArtistProfile, ArtistFollow, ArtistModerator, Role } = require('../models');
const { Op } = require('sequelize');
const contentLifecycleService = require('../services/contentLifecycleService');

// Helper to retrieve assigned artist IDs for the logged-in moderator.
// Returns null if the user is an admin or superadmin (no restrictions).
const getAssignedArtistIds = async (user) => {
  const roleSlug = (user.Role?.slug || user.role || '').toLowerCase();
  if (roleSlug === 'admin' || roleSlug === 'superadmin') {
    return null;
  }
  const assignments = await ArtistModerator.findAll({
    where: { moderator_id: user.id },
    attributes: ['artist_id']
  });
  return assignments.map(a => a.artist_id);
};

// GET /api/moderator/reports
const getReports = async (req, res) => {
  try {
    const assignedArtistIds = await getAssignedArtistIds(req.user);

    if (assignedArtistIds !== null && assignedArtistIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No assigned artists found for moderator.',
        reports: []
      });
    }

    const songWhere = {};
    if (assignedArtistIds !== null) {
      songWhere.artist_id = { [Op.in]: assignedArtistIds };
    }

    const reports = await Report.findAll({
      include: [
        {
          model: User,
          as: 'Reporter',
          attributes: ['id', 'username', 'display_name', 'email']
        },
        {
          model: Song,
          as: 'Song',
          where: songWhere,
          required: assignedArtistIds !== null,
          attributes: ['id', 'title', 'status', 'audio_url', 'artist_id'],
          include: [
            {
              model: User,
              as: 'Artist',
              attributes: ['id', 'username', 'display_name']
            }
          ]
        },
        {
          model: User,
          as: 'Resolver',
          attributes: ['id', 'username', 'display_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      message: `Reports fetched by moderator ${req.user.username}.`,
      reports: reports.map(r => ({
        id: r.id,
        type: 'track',
        title: r.Song?.title || 'Unknown Song',
        song_id: r.song_id,
        song_status: r.Song?.status,
        audio_url: r.Song?.audio_url || null,
        artist_name: r.Song?.Artist?.display_name || r.Song?.Artist?.username || 'Unknown',
        artist_id: r.Song?.artist_id,
        reporter_name: r.Reporter?.display_name || r.Reporter?.username || 'Unknown',
        reporter_email: r.Reporter?.email,
        reason: r.reason,
        status: r.status,
        resolution_note: r.resolution_note,
        resolved_by: r.Resolver?.display_name || r.Resolver?.username || null,
        reported_at: r.created_at,
        updated_at: r.updated_at
      }))
    });
  } catch (err) {
    console.error('Moderator getReports error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const resolveReport = async (req, res) => {
  const reportId = req.params.id;
  const { action, resolution_note } = req.body; // 'resolve' or 'dismiss'

  try {
    const report = await Report.findByPk(reportId, {
      include: [{ model: Song, as: 'Song', attributes: ['artist_id'] }]
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const assignedArtistIds = await getAssignedArtistIds(req.user);
    if (assignedArtistIds !== null && (!report.Song || !assignedArtistIds.includes(report.Song.artist_id))) {
      return res.status(403).json({ success: false, message: 'You are not authorized to handle reports for this artist.' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This report has already been handled.' });
    }

    const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
    
    await report.update({
      status: newStatus,
      resolved_by: req.user.id,
      resolution_note: resolution_note || null
    });

    return res.status(200).json({
      success: true,
      message: `Report #${reportId} has been ${newStatus} by ${req.user.username}.`,
    });
  } catch (err) {
    console.error('Moderator resolveReport error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/moderator/pending-content
const getPendingContent = async (req, res) => {
  try {
    const assignedArtistIds = await getAssignedArtistIds(req.user);

    if (assignedArtistIds !== null && assignedArtistIds.length === 0) {
      return res.status(200).json({
        success: true,
        pending: {
          songs: [],
          albums: []
        }
      });
    }

    const songWhere = { status: 'pending_review' };
    const albumWhere = { status: 'pending_review' };

    if (assignedArtistIds !== null) {
      songWhere.artist_id = { [Op.in]: assignedArtistIds };
      albumWhere.artist_id = { [Op.in]: assignedArtistIds };
    }

    const songs = await Song.findAll({
      where: songWhere,
      include: [
        { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name'] },
        { model: Category, attributes: ['id', 'name'] }
      ]
    });

    const albums = await Album.findAll({
      where: albumWhere,
      include: [
        { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name'] }
      ]
    });

    return res.status(200).json({
      success: true,
      pending: {
        songs,
        albums
      }
    });
  } catch (err) {
    console.error('Moderator getPendingContent error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/moderator/review/:type/:id
const reviewContent = async (req, res) => {
  const { type, id } = req.params;
  const { action, reason, scheduled_at } = req.body;

  try {
    let entity;
    if (type === 'song') {
      entity = await Song.findByPk(id);
    } else if (type === 'album') {
      entity = await Album.findByPk(id);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid content type.' });
    }

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Content not found.' });
    }

    const assignedArtistIds = await getAssignedArtistIds(req.user);
    if (assignedArtistIds !== null && !assignedArtistIds.includes(entity.artist_id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to moderate content for this artist.' });
    }

    let targetStatus;
    if (action === 'approve') {
      targetStatus = scheduled_at ? 'scheduled' : 'published';
    } else if (action === 'reject') {
      targetStatus = 'draft';
      if (!reason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use "approve" or "reject".' });
    }

    const updatedEntity = await contentLifecycleService.transitionStatus(entity, targetStatus, req.user, {
      rejection_reason: reason,
      scheduled_at
    });

    return res.status(200).json({
      success: true,
      message: `Content ${action}d successfully.`,
      content: updatedEntity
    });
  } catch (err) {
    console.error('Moderator reviewContent error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error.' });
  }
};

// DELETE /api/moderator/songs/:id — Archive/remove a reported song
const removeSong = async (req, res) => {
  try {
    const songId = req.params.id;
    const song = await Song.findByPk(songId);

    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    const assignedArtistIds = await getAssignedArtistIds(req.user);
    if (assignedArtistIds !== null && !assignedArtistIds.includes(song.artist_id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to remove songs for this artist.' });
    }

    await song.update({
      status: 'archived',
      archived_at: new Date()
    });

    // Also resolve any pending reports for this song
    await Report.update(
      { status: 'resolved', resolved_by: req.user.id, resolution_note: 'Song removed by moderator.' },
      { where: { song_id: songId, status: 'pending' } }
    );

    return res.status(200).json({
      success: true,
      message: `Song "${song.title}" has been removed (archived) by moderator.`
    });
  } catch (err) {
    console.error('Moderator removeSong error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/moderator/songs/:id — Edit a song (title, status)
const updateSong = async (req, res) => {
  try {
    const songId = req.params.id;
    const { title, status } = req.body;

    const song = await Song.findByPk(songId);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    const assignedArtistIds = await getAssignedArtistIds(req.user);
    if (assignedArtistIds !== null && !assignedArtistIds.includes(song.artist_id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit songs for this artist.' });
    }

    const updates = {};
    if (title && title.trim()) updates.title = title.trim();
    if (status) {
      const validStatuses = ['draft', 'pending_review', 'scheduled', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updates.status = status;
      if (status === 'archived') updates.archived_at = new Date();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    }

    await song.update(updates);

    return res.status(200).json({
      success: true,
      message: `Song updated successfully.`,
      song
    });
  } catch (err) {
    console.error('Moderator updateSong error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/moderator/artists — Artist Dashboard data (only assigned artists)
const getArtistsDashboard = async (req, res) => {
  try {
    const assignedArtistIds = await getAssignedArtistIds(req.user);

    if (assignedArtistIds !== null && assignedArtistIds.length === 0) {
      return res.status(200).json({
        success: true,
        artists: [],
        message: 'You are not assigned to any artist yet.'
      });
    }

    const artistWhere = { is_deleted: false };
    if (assignedArtistIds !== null) {
      artistWhere.id = { [Op.in]: assignedArtistIds };
    }

    // Fetch only the assigned artists (or all if admin/superadmin)
    const artists = await User.findAll({
      where: artistWhere,
      attributes: ['id', 'username', 'display_name', 'email', 'is_active', 'is_verified', 'avatar_url', 'created_at'],
      include: [
        {
          model: ArtistProfile,
          attributes: ['bio', 'banner_url', 'twitter_url', 'instagram_url', 'spotify_url']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Fetch counts and songs for each assigned artist
    const artistData = await Promise.all(artists.map(async (artist) => {
      const [songs, albumCount, followerCount] = await Promise.all([
        Song.findAll({
          where: { artist_id: artist.id },
          attributes: ['id', 'title', 'status', 'play_count', 'likes_count', 'audio_url', 'created_at'],
          include: [
            { model: Category, attributes: ['id', 'name'] },
            { model: Album, attributes: ['id', 'title'] }
          ],
          order: [['created_at', 'DESC']]
        }),
        Album.count({ where: { artist_id: artist.id } }),
        ArtistFollow.count({ where: { artist_id: artist.id } })
      ]);

      return {
        id: artist.id,
        username: artist.username,
        display_name: artist.display_name,
        email: artist.email,
        is_active: artist.is_active,
        is_verified: artist.is_verified,
        avatar_url: artist.avatar_url,
        created_at: artist.created_at,
        profile: artist.ArtistProfile || null,
        songs: songs.map(s => ({
          id: s.id,
          title: s.title,
          status: s.status,
          play_count: s.play_count,
          likes_count: s.likes_count,
          audio_url: s.audio_url,
          category: s.Category?.name || 'Uncategorized',
          album: s.Album?.title || null,
          created_at: s.created_at
        })),
        stats: {
          total_songs: songs.length,
          total_albums: albumCount,
          total_followers: followerCount
        }
      };
    }));

    return res.status(200).json({
      success: true,
      artists: artistData
    });
  } catch (err) {
    console.error('Moderator getArtistsDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { getReports, resolveReport, getPendingContent, reviewContent, removeSong, updateSong, getArtistsDashboard };

