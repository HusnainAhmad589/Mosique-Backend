const express = require('express');
const router = express.Router();

const { 
  getFeed, 
  addFavorite, 
  removeFavorite,
  getFavorites,
  getAlbums, 
  getPlaylists, 
  addToPlaylist,
  deletePlaylist,
  saveAlbum,
  removeSavedAlbum,
  getSavedAlbums
} = require('../controllers/listenerController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');


//  Protected Listener Routes (listener is minimum role — artists and above can also access via hierarchy)


router.use(verifyToken);
router.use(requireRole('listener'));

// GET /api/listener/feed
router.get('/feed', getFeed);

// GET /api/listener/albums
router.get('/albums', getAlbums);

// --- Favorites (Songs) ---
router.get('/favorites', getFavorites);
router.post('/favorites', addFavorite);
router.delete('/favorites/:id', removeFavorite);

// --- Saved Albums ---
router.get('/saved-albums', getSavedAlbums);
router.post('/saved-albums', saveAlbum);
router.delete('/saved-albums/:id', removeSavedAlbum);

// --- Playlists ---
router.get('/playlists', getPlaylists);

// POST /api/listener/playlists — creates playlist if needed and adds song
router.post('/playlists', addToPlaylist);

// DELETE /api/listener/playlists/:id
router.delete('/playlists/:id', deletePlaylist);

module.exports = router;
