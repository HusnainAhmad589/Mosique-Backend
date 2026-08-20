const express = require('express');
const router = express.Router();

const { getReports, resolveReport, getPendingContent, reviewContent, removeSong, updateSong, getArtistsDashboard } = require('../controllers/moderatorController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────
//  Protected Moderator Routes (moderator and above)
// ─────────────────────────────────────────────────────────

router.use(verifyToken);
router.use(requireRole('moderator'));

// GET /api/moderator/reports
router.get('/reports', getReports);

// PUT /api/moderator/reports/:id/resolve
router.put('/reports/:id/resolve', resolveReport);

// GET /api/moderator/pending-content
router.get('/pending-content', getPendingContent);

// PUT /api/moderator/review/:type/:id
router.put('/review/:type/:id', reviewContent);

// DELETE /api/moderator/songs/:id — Remove (archive) a song
router.delete('/songs/:id', removeSong);

// PUT /api/moderator/songs/:id — Edit a song (title, status)
router.put('/songs/:id', updateSong);

// GET /api/moderator/artists — Artist Dashboard data
router.get('/artists', getArtistsDashboard);

module.exports = router;
