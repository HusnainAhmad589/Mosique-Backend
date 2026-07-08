
//  GET /api/moderator/reports
//  Requires: moderator and above

const getReports = async (req, res) => {
  try {
    // Placeholder — returns mock reported content
    return res.status(200).json({
      success: true,
      message: `Reports fetched by moderator ${req.user.username}.`,
      reports: [
        { id: 1, type: 'track',   title: 'Inappropriate Song',   status: 'pending',  reported_at: '2026-06-28' },
        { id: 2, type: 'comment', title: 'Hateful Comment',      status: 'pending',  reported_at: '2026-06-29' },
        { id: 3, type: 'profile', title: 'Fake Artist Profile',  status: 'resolved', reported_at: '2026-06-25' },
      ],
    });
  } catch (err) {
    console.error('Moderator getReports error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


//  PUT /api/moderator/reports/:id/resolve
//  Requires: moderator and above

const resolveReport = async (req, res) => {
  const reportId = req.params.id;
  const { action } = req.body; // 'approve' or 'reject'

  try {
    // Placeholder — in a real app this would update the reports table
    return res.status(200).json({
      success: true,
      message: `Report #${reportId} has been ${action || 'resolved'} by ${req.user.username}.`,
    });
  } catch (err) {
    console.error('Moderator resolveReport error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { getReports, resolveReport };
