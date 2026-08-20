const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { 
  getProfile, 
  updateProfile, 
  getAlbums, 
  createAlbum, 
  updateAlbumStatus,
  deleteAlbum,
  getSongs, 
  publishSong, 
  deleteSong,
  getArtistStats,
  getModerators,
  addModerator,
  removeModerator,
  generateLyrics,
  updateLyrics,
  getLyricsStatus
} = require('../controllers/artistController');

const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadAudio, uploadImage } = require('../middleware/uploadMiddleware');

//  Protected Artist Routes (artist and above)

router.use(verifyToken);
router.use(requireRole('artist'));

// --- Profile ---
router.get('/profile', getProfile);
router.put('/profile', uploadImage.single('banner'), updateProfile);

// --- Albums ---
router.get('/albums', getAlbums);
router.post('/albums', uploadImage.single('artwork'), createAlbum);
router.put('/albums/:id/status', updateAlbumStatus);
router.delete('/albums/:id', deleteAlbum);

// --- Songs ---
router.get('/songs', getSongs);
router.post('/songs', uploadAudio.single('audio'), publishSong);
router.post('/songs/:id/generate-lyrics', generateLyrics);
router.get('/songs/:id/lyrics-status', getLyricsStatus);
router.put('/songs/:id/lyrics', updateLyrics);
router.delete('/songs/:id', deleteSong);

// --- Moderators ---
router.get('/moderators', getModerators);
router.post('/moderators', addModerator);
router.delete('/moderators/:id', removeModerator);

// --- Stats (Placeholder) ---
router.get('/stats', getArtistStats);

module.exports = router;

