const express = require('express');
const router = express.Router();

const { getFeed, addFavorite } = require('../controllers/listenerController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');


//  Protected Listener Routes (any logged-in user)


router.use(verifyToken);
router.use(requireRole('listener'));

// GET /api/listener/feed
router.get('/feed', getFeed);

// POST /api/listener/favorites
router.post('/favorites', addFavorite);

module.exports = router;
