const express = require('express');
const router = express.Router();

const { 
  getProfile, 
  updateProfile, 
  getAlbums, 
  createAlbum, 
  getSongs, 
  publishSong, 
  getArtistStats 
} = require('../controllers/artistController');

const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadAudio, uploadImage } = require('../middleware/uploadMiddleware');

// ─────────────────────────────────────────────────────────
//  Protected Artist Routes (artist and above)
// ─────────────────────────────────────────────────────────

router.use(verifyToken);
router.use(requireRole('artist'));

// --- Profile ---
router.get('/profile', getProfile);
router.put('/profile', uploadImage.single('banner'), updateProfile);

// --- Albums ---
router.get('/albums', getAlbums);
router.post('/albums', uploadImage.single('artwork'), createAlbum);

// --- Songs ---
router.get('/songs', getSongs);
router.post('/songs', uploadAudio.single('audio'), publishSong);

// --- Stats (Placeholder) ---
router.get('/stats', getArtistStats);

module.exports = router;
