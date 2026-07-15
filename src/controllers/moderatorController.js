const { Song, Album, User, Category } = require('../models');
const contentLifecycleService = require('../services/contentLifecycleService');

//  GET /api/moderator/reports
const getReports = async (req, res) => {
  try {
    // Placeholder — returns mock reported content
    return res.status(200).json({
      success: true,
      message: `Reports fetched by moderator ${req.user.username}.`,
      reports: [
        { id: 1, type: 'track',   title: 'Inappropriate Song',   status: 'pending',  reported_at: '2026-06-28' },
        { id: 2, type: 'comment', title: 'Hateful Comment',      status: 'pending',  reported_at: '2026-06-29' },
        { id: 3, type: 'profile', title: 'Fake Artist Profile',  status: 'resolved', reported_at: '2026-06-25' },
      ],
    });
  } catch (err) {
    console.error('Moderator getReports error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const resolveReport = async (req, res) => {
  const reportId = req.params.id;
  const { action } = req.body; // 'approve' or 'reject'

  try {
    return res.status(200).json({
      success: true,
      message: `Report #${reportId} has been ${action || 'resolved'} by ${req.user.username}.`,
    });
  } catch (err) {
    console.error('Moderator resolveReport error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/moderator/pending-content
const getPendingContent = async (req, res) => {
  try {
    const songs = await Song.findAll({
      where: { status: 'pending_review' },
      include: [
        { model: User, as: 'Artist', attributes: ['id', 'username', 'display_name'] },
        { model: Category, attributes: ['id', 'name'] }
      ]
    });

    const albums = await Album.findAll({
      where: { status: 'pending_review' },
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

module.exports = { getReports, resolveReport, getPendingContent, reviewContent };
