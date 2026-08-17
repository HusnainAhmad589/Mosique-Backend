'use strict';

const { Album, Song } = require('../../models');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const contentLifecycleService = require('../../services/contentLifecycleService');
const { deleteMediaFile } = require('../../services/mediaCleanupService');

exports.getAlbums = async (req, res) => {
  try {
    const albums = await Album.findAll({
      where: { artist_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.status(200).json({ success: true, albums });
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createAlbum = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { title, description, release_date, status } = req.body;
    
    const cover_url = req.file ? `/uploads/artwork/${req.file.filename}` : null;
    const initialStatus = ['draft', 'pending_review', 'published'].includes(status) ? status : 'draft';

    const album = await Album.create({
      artist_id: req.user.id,
      title,
      description,
      release_date,
      status: initialStatus,
      cover_url
    });

    res.status(201).json({ success: true, message: 'Album created successfully', album });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateAlbumStatus = async (req, res) => {
  try {
    const { status, scheduled_at } = req.body;
    
    const album = await Album.findOne({ where: { id: req.params.id, artist_id: req.user.id } });
    
    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found or access denied.' });
    }

    const updatedAlbum = await contentLifecycleService.transitionStatus(album, status, req.user, { scheduled_at });

    res.status(200).json({ success: true, message: `Album status updated to ${status}.`, album: updatedAlbum });
  } catch (error) {
    console.error('Error updating album status:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.deleteAlbum = async (req, res) => {
  try {
    const album = await Album.findOne({ where: { id: req.params.id, artist_id: req.user.id } });
    
    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found or access denied.' });
    }

    await Song.update({ album_id: null }, { where: { album_id: album.id } });

    if (album.cover_url) {
      deleteMediaFile(album.cover_url);
    }

    await album.destroy();

    res.status(200).json({ success: true, message: 'Album deleted successfully.' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
