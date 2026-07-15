const { Song, Album, User } = require('../models');

// Define allowed transitions per role
const VALID_TRANSITIONS = {
  artist: {
    'draft': ['pending_review', 'published'], // published only if no moderation required
    'published': ['archived'],
    'pending_review': ['draft'], // can pull back from review
    'archived': ['draft', 'published'] // can unarchive
  },
  moderator: {
    'pending_review': ['published', 'draft', 'scheduled'],
    'published': ['archived'],
    'scheduled': ['published', 'archived']
  },
  admin: { // admin inherits moderator transitions + maybe more
    'pending_review': ['published', 'draft', 'scheduled'],
    'published': ['archived'],
    'scheduled': ['published', 'archived']
  },
  superAdmin: {
    'draft': ['published', 'archived', 'pending_review'],
    'pending_review': ['published', 'draft', 'scheduled', 'archived'],
    'published': ['archived', 'draft'],
    'scheduled': ['published', 'archived', 'draft'],
    'archived': ['draft', 'published']
  }
};

class ContentLifecycleService {
  /**
   * Validates and applies a status transition for a song or album.
   * @param {Object} entity - The Sequelize model instance (Song or Album)
   * @param {string} targetStatus - The status to transition to
   * @param {Object} user - The user performing the action (req.user)
   * @param {Object} options - Additional metadata (e.g. rejection_reason, scheduled_at)
   */
  async transitionStatus(entity, targetStatus, user, options = {}) {
    const currentStatus = entity.status;
    const role = user.role;

    if (currentStatus === targetStatus) {
      return entity; // No change needed
    }

    // Determine allowed transitions for this role
    let allowedTransitions = VALID_TRANSITIONS[role] ? VALID_TRANSITIONS[role][currentStatus] : null;

    // Fallback: artist role logic for owners
    if (!allowedTransitions && (role === 'artist' || entity.artist_id === user.id)) {
      allowedTransitions = VALID_TRANSITIONS['artist'][currentStatus];
    }

    if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
      const requireReview = process.env.REQUIRE_CONTENT_REVIEW !== 'false';
      if (role === 'artist' && currentStatus === 'draft' && targetStatus === 'published' && requireReview) {
        throw { status: 403, message: 'Content must be submitted for review first.' };
      }
      if (role === 'artist' && currentStatus === 'draft' && targetStatus === 'published' && !requireReview) {
         // allow if requireReview is false
      } else {
        throw { status: 403, message: `Invalid status transition from ${currentStatus} to ${targetStatus} for your role.` };
      }
    }

    // Apply the transition
    entity.status = targetStatus;

    // Apply metadata based on transition
    if (targetStatus === 'published') {
      entity.rejection_reason = null; // clear previous rejection
      if (['moderator', 'admin', 'superAdmin'].includes(role)) {
        entity.reviewed_by = user.id;
      }
    } else if (targetStatus === 'draft' && currentStatus === 'pending_review' && ['moderator', 'admin', 'superAdmin'].includes(role)) {
      // Rejection
      entity.rejection_reason = options.rejection_reason || 'Rejected by moderator.';
      entity.reviewed_by = user.id;
    } else if (targetStatus === 'scheduled') {
      if (!options.scheduled_at) {
        throw { status: 400, message: 'scheduled_at is required when scheduling content.' };
      }
      entity.scheduled_at = options.scheduled_at;
      if (['moderator', 'admin', 'superAdmin'].includes(role)) {
        entity.reviewed_by = user.id;
      }
    } else if (targetStatus === 'archived') {
      entity.archived_at = new Date();
    }

    await entity.save();
    return entity;
  }

  /**
   * Process scheduled content that is ready to be published.
   * Can be called by a cron job or scheduled task.
   */
  async processScheduledContent() {
    const now = new Date();
    
    // Find scheduled songs ready to publish
    const songs = await Song.findAll({
      where: {
        status: 'scheduled',
        scheduled_at: {
          [require('sequelize').Op.lte]: now
        }
      }
    });

    for (const song of songs) {
      song.status = 'published';
      await song.save();
    }

    // Find scheduled albums ready to publish
    const albums = await Album.findAll({
      where: {
        status: 'scheduled',
        scheduled_at: {
          [require('sequelize').Op.lte]: now
        }
      }
    });

    for (const album of albums) {
      album.status = 'published';
      await album.save();
    }

    return { songsPublished: songs.length, albumsPublished: albums.length };
  }
}

module.exports = new ContentLifecycleService();
