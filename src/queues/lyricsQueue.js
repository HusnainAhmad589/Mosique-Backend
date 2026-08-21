'use strict';

const { Queue } = require('bullmq');

let connection;

if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  connection = {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null
  };
} else {
  connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: (process.env.REDIS_TLS === 'true') ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null
  };
}

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
