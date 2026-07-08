
//  GET /api/listener/feed
//  Requires: listener and above (any logged-in user)

const getFeed = async (req, res) => {
  try {
    // Placeholder — returns mock music feed
    return res.status(200).json({
      success: true,
      message: `Music feed for ${req.user.username}.`,
      feed: [
        { id: 1, title: 'Blinding Lights',  artist: 'The Weeknd',   duration: '3:20' },
        { id: 2, title: 'Shape of You',     artist: 'Ed Sheeran',   duration: '3:53' },
        { id: 3, title: 'Levitating',       artist: 'Dua Lipa',     duration: '3:23' },
        { id: 4, title: 'Stay',             artist: 'Justin Bieber', duration: '2:21' },
      ],
    });
  } catch (err) {
    console.error('Listener getFeed error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

//  POST /api/listener/favorites
//  Requires: listener and above (any logged-in user)

const addFavorite = async (req, res) => {
  const { trackId } = req.body;

  try {
    // Placeholder — in a real app this would insert into a favorites table
    return res.status(200).json({
      success: true,
      message: `Track #${trackId || 'unknown'} added to ${req.user.username}'s favorites! ❤️`,
    });
  } catch (err) {
    console.error('Listener addFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { getFeed, addFavorite };
