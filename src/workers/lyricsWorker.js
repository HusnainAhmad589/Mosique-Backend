'use strict';

const { Worker } = require('bullmq');
const { connection, LYRICS_QUEUE_NAME } = require('../queues/lyricsQueue');
const { Song } = require('../models');
const { transcribeAudioToLyrics } = require('../services/whisperService');

let worker = null;

const startLyricsWorker = () => {
  if (worker) return worker;

  console.log('[Lyrics Worker] Initializing BullMQ worker for lyrics generation...');

  worker = new Worker(
    LYRICS_QUEUE_NAME,
    async (job) => {
      const { songId, audioPath, title } = job.data;
      console.log(`[Lyrics Worker] Processing job #${job.id} for Song ID: ${songId} ("${title}")`);

      const song = await Song.findByPk(songId);
      if (!song) {
        throw new Error(`Song ID ${songId} not found in database.`);
      }

      // Mark song lyrics as processing
      song.lyrics_status = 'processing';
      song.lyrics_error = null;
      await song.save();

      try {
        // Run python transcription pipeline (demucs -> faster-whisper -> romanization -> cleaning -> validation)
        const lyricsData = await transcribeAudioToLyrics(audioPath, title);

        if (!Array.isArray(lyricsData) || lyricsData.length === 0) {
          throw new Error('Transcription output empty or invalid format.');
        }

        // Validate Latin-script lyrics requirement (English or Roman Urdu/Hindi/Punjabi are all acceptable)
        const combinedText = lyricsData.map(line => line.text).join(' ');
        
        // Rejection check: reject only if raw non-Latin scripts (Arabic/Urdu, Devanagari, Gurmukhi, CJK, etc.) remain in final output
        // Roman Urdu (e.g. "bap pe mat ja mujh pe mat ja") is 100% valid — it IS Latin script
        const nonLatinScriptRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u097F\u0A00-\u0A7F\u4E00-\u9FFF]/;
        if (nonLatinScriptRegex.test(combinedText)) {
          throw new Error('Lyrics validation failed: raw non-Latin script detected in final output. Romanization did not complete.');
        }

        // Check that at least 50% of characters are Latin (allows numbers, punctuation, etc.)
        const latinChars = (combinedText.match(/[a-zA-Z]/g) || []).length;
        const totalChars = combinedText.replace(/\s+/g, '').length;
        if (totalChars > 0 && (latinChars / totalChars) < 0.35) {
          throw new Error('Lyrics validation failed: insufficient Latin/Roman content in output.');
        }

        // Save lyrics (Roman Urdu / English / any Latin-script romanization accepted)
        song.lyrics = JSON.stringify(lyricsData);
        song.lyrics_status = 'completed';
        song.lyrics_error = null;
        await song.save();

        console.log(`[Lyrics Worker] Job #${job.id} successfully completed for Song ID: ${songId}`);
        return { success: true, count: lyricsData.length };
      } catch (err) {
        console.error(`[Lyrics Worker Error] Job #${job.id} failed for Song ID: ${songId}:`, err.message);

        // Update MySQL record with failure status and error details
        song.lyrics_status = 'failed';
        song.lyrics_error = err.message;
        await song.save();

        throw err; // Re-throw to allow BullMQ to handle job retries if attempts remain
      }
    },
    {
      connection,
      concurrency: 1, // Single job concurrency for maximum CPU performance per track
      lockDuration: 600000, // 10 minutes lock duration to allow full vocal separation + transcription
      stalledInterval: 120000,
      maxStalledCount: 5
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Lyrics Worker] Job #${job?.id} permanently failed: ${err.message}`);
  });

  worker.on('completed', (job) => {
    console.log(`[Lyrics Worker] Job #${job.id} finished successfully.`);
  });

  return worker;
};

module.exports = {
  startLyricsWorker
};
