const express = require('express');
const router = express.Router();

const { uploadTrack, getArtistStats } = require('../controllers/artistController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────
//  Protected Artist Routes (artist and above)
// ─────────────────────────────────────────────────────────

router.use(verifyToken);
router.use(requireRole('artist'));

// POST /api/artist/tracks
router.post('/tracks', uploadTrack);

// GET /api/artist/stats
router.get('/stats', getArtistStats);

module.exports = router;
