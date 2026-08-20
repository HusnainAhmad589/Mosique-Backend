'use strict';

const { User, Role, ArtistModerator } = require('../../models');

/**
 * GET /api/artist/moderators
 * Fetch list of personal moderators added by the logged-in artist
 */
exports.getModerators = async (req, res) => {
  try {
    const list = await ArtistModerator.findAll({
      where: { artist_id: req.user.id },
      include: [
        {
          model: User,
          as: 'Moderator',
          attributes: ['id', 'username', 'email', 'display_name', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const moderators = list.map(item => ({
      id: item.Moderator ? item.Moderator.id : item.moderator_id,
      link_id: item.id,
      username: item.Moderator ? item.Moderator.username : 'Unknown',
      email: item.Moderator ? item.Moderator.email : '',
      display_name: item.Moderator ? item.Moderator.display_name : '',
      avatar_url: item.Moderator ? item.Moderator.avatar_url : null,
      created_at: item.created_at
    }));

    return res.status(200).json({
      success: true,
      moderators
    });
  } catch (error) {
    console.error('Error fetching artist moderators:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/artist/moderators
 * Add a listener by email as a personal moderator for the artist
 */
exports.addModerator = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Find user by email
    const targetUser = await User.findOne({
      where: { email: cleanEmail },
      include: [{ model: Role }]
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `No user found with email "${email}". Please verify the email.`
      });
    }

    // 2. Prevent adding self
    if (targetUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as your own moderator.'
      });
    }

    // 3. Check if already added as personal moderator by this artist
    const existingLink = await ArtistModerator.findOne({
      where: {
        artist_id: req.user.id,
        moderator_id: targetUser.id
      }
    });

    if (existingLink) {
      return res.status(400).json({
        success: false,
        message: `${targetUser.display_name || targetUser.username} (${targetUser.email}) is already your personal moderator.`
      });
    }

    // 4. Find Moderator role
    const moderatorRole = await Role.findOne({ where: { slug: 'moderator' } });
    if (!moderatorRole) {
      return res.status(500).json({ success: false, message: 'Moderator role not configured in system.' });
    }

    // Upgrade target user role to 'moderator' if they are currently a listener
    const currentRoleSlug = targetUser.Role ? targetUser.Role.slug : 'listener';
    if (currentRoleSlug === 'listener') {
      await targetUser.update({ role_id: moderatorRole.id });
    }

    // 5. Create ArtistModerator record
    const newModLink = await ArtistModerator.create({
      artist_id: req.user.id,
      moderator_id: targetUser.id
    });

    return res.status(201).json({
      success: true,
      message: `${targetUser.display_name || targetUser.username} (${targetUser.email}) has been set as your personal moderator!`,
      moderator: {
        id: targetUser.id,
        link_id: newModLink.id,
        username: targetUser.username,
        email: targetUser.email,
        display_name: targetUser.display_name,
        avatar_url: targetUser.avatar_url,
        created_at: newModLink.created_at
      }
    });
  } catch (error) {
    console.error('Error adding artist moderator:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /api/artist/moderators/:id
 * Remove a personal moderator. Reverts their role back to 'listener' if no other artist links exist.
 */
exports.removeModerator = async (req, res) => {
  const moderatorUserId = parseInt(req.params.id, 10);

  if (!moderatorUserId || isNaN(moderatorUserId)) {
    return res.status(400).json({ success: false, message: 'Invalid moderator ID.' });
  }

  try {
    const link = await ArtistModerator.findOne({
      where: {
        artist_id: req.user.id,
        moderator_id: moderatorUserId
      }
    });

    if (!link) {
      return res.status(404).json({ success: false, message: 'Personal moderator record not found.' });
    }

    await link.destroy();

    // Check if this moderator is linked to any other artists
    const remainingLinksCount = await ArtistModerator.count({
      where: { moderator_id: moderatorUserId }
    });

    // If no other artist has them as moderator, demote back to listener role
    if (remainingLinksCount === 0) {
      const listenerRole = await Role.findOne({ where: { slug: 'listener' } });
      if (listenerRole) {
        await User.update(
          { role_id: listenerRole.id },
          { where: { id: moderatorUserId } }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Moderator removed successfully and returned to listener status.'
    });
  } catch (error) {
    console.error('Error removing artist moderator:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
