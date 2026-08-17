'use strict';

const { ArtistProfile } = require('../../models');
const { deleteMediaFile } = require('../../services/mediaCleanupService');

exports.getProfile = async (req, res) => {
  try {
    let profile = await ArtistProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) {
      profile = await ArtistProfile.create({ user_id: req.user.id });
    }
    res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { bio, twitter_url, instagram_url, spotify_url } = req.body;
    let profile = await ArtistProfile.findOne({ where: { user_id: req.user.id } });
    
    if (!profile) {
      profile = await ArtistProfile.create({ user_id: req.user.id });
    }

    let banner_url = profile.banner_url;
    if (req.file) {
      if (profile.banner_url) {
        deleteMediaFile(profile.banner_url);
      }
      banner_url = `/uploads/artwork/${req.file.filename}`;
    }

    await profile.update({
      bio,
      twitter_url,
      instagram_url,
      spotify_url,
      banner_url
    });

    res.status(200).json({ success: true, message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error('Error updating artist profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
