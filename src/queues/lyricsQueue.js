'use strict';

const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
};

const LYRICS_QUEUE_NAME = 'lyrics-generation';

const lyricsQueue = new Queue(LYRICS_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 3600, // keep completed jobs for 1 hour
      count: 100
    },
    removeOnFail: {
      age: 86400, // keep failed jobs for 24 hours
      count: 500
    }
  }
});

/**
 * Add a new audio lyrics generation job to BullMQ queue
 */
const addLyricsJob = async (songId, audioPath, title) => {
  return await lyricsQueue.add('generate-lyrics', {
    songId,
    audioPath,
    title,
    timestamp: Date.now()
  }, {
    jobId: `lyrics-song-${songId}-${Date.now()}`
  });
};

module.exports = {
  lyricsQueue,
  addLyricsJob,
  connection,
  LYRICS_QUEUE_NAME
};
