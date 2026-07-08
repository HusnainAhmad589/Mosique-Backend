const express = require('express');
const router = express.Router();

const { getReports, resolveReport } = require('../controllers/moderatorController');
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

module.exports = router;
