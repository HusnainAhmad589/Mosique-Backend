'use strict';

const { Song, Album } = require('../models');
const { Op } = require('sequelize');

/**
 * Service to handle content lifecycle transitions automatically (e.g. publishing scheduled releases).
 */
const checkAndPublishScheduledContent = async () => {
  try {
    const now = new Date();

    // Publish scheduled songs
    const [publishedSongsCount] = await Song.update(
      { status: 'published' },
      {
        where: {
          status: 'scheduled',
          scheduled_at: { [Op.lte]: now }
        }
      }
    );

    // Publish scheduled albums
    const [publishedAlbumsCount] = await Album.update(
      { status: 'published' },
      {
        where: {
          status: 'scheduled',
          scheduled_at: { [Op.lte]: now }
        }
      }
    );

    if (publishedSongsCount > 0 || publishedAlbumsCount > 0) {
      console.log(`[Scheduler] Auto-published ${publishedSongsCount} songs and ${publishedAlbumsCount} albums.`);
    }

    return { publishedSongsCount, publishedAlbumsCount };
  } catch (error) {
    console.error('[Scheduler] Error processing scheduled content:', error);
    return { publishedSongsCount: 0, publishedAlbumsCount: 0 };
  }
};

module.exports = {
  checkAndPublishScheduledContent,
};
