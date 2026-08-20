'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

/**
 * Execute local Python faster-whisper + Demucs model
 */
const transcribeLocally = async (fullPath) => {
  const pythonCandidates = [
    path.join(__dirname, '../../python_env310/bin/python'),
    path.join(__dirname, '../../python_env/bin/python'),
    path.join(__dirname, '../../python_env310/Scripts/python.exe'),
    path.join(__dirname, '../../python_env/Scripts/python.exe'),
    '/usr/local/bin/python3.10',
    'python3',
    'python'
  ];

  const pythonBin = pythonCandidates.find(p => fs.existsSync(p)) || 'python3';
  const scriptPath = path.join(__dirname, '../../scripts/transcribe.py');

  if (!fs.existsSync(scriptPath)) {
    throw new Error('Local transcribe.py script not found.');
  }

  console.log(`[Whisper Service] Running local Demucs + faster-whisper AI model via: ${pythonBin}`);
  
  // Timeout after 480 seconds (demucs CLI ~2-3min + whisper ~1-2min on CPU)
  const { stdout } = await execFileAsync(pythonBin, [scriptPath, fullPath, 'small'], { 
    timeout: 480000,
    env: {
      ...process.env,
      KMP_DUPLICATE_LIB_OK: 'TRUE',
      PYTHONUNBUFFERED: '1',
      OMP_NUM_THREADS: '1',
      OBJC_DISABLE_INITIALIZE_FORK_SAFETY: 'YES'
    }
  });
  
  // Find JSON array or object in stdout
  const trimmed = stdout.trim();
  const jsonStart = trimmed.indexOf('[');
  const objStart = trimmed.indexOf('{');
  
  let jsonString = trimmed;
  if (jsonStart !== -1 && (objStart === -1 || jsonStart < objStart)) {
    const jsonEnd = trimmed.lastIndexOf(']');
    if (jsonEnd !== -1) jsonString = trimmed.substring(jsonStart, jsonEnd + 1);
  } else if (objStart !== -1) {
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonEnd !== -1) jsonString = trimmed.substring(objStart, jsonEnd + 1);
  }

  const result = JSON.parse(jsonString);

  if (result.error) {
    throw new Error(result.error);
  }

  if (Array.isArray(result) && result.length > 0) {
    return result;
  }

  throw new Error('No speech detected in audio file.');
};

/**
 * Service to transcribe audio files into timestamped English lyrics.
 * Uses local Python faster-whisper + Demucs pipeline.
 * Returns an array of objects: [{ time: number, text: string }]
 */
const transcribeAudioToLyrics = async (audioFilePath, songTitle = 'Track') => {
  // Resolve absolute audio file path
  let fullPath = null;
  if (audioFilePath) {
    const relativePath = audioFilePath.replace(/^\//, '');
    const candidates = [
      path.join(__dirname, '../../', relativePath),
      path.join(__dirname, '../../uploads/audio', path.basename(relativePath)),
      path.resolve(audioFilePath)
    ];
    fullPath = candidates.find(p => fs.existsSync(p));
  }

  if (!fullPath || !fs.existsSync(fullPath)) {
    throw new Error(`Audio file does not exist at path: ${audioFilePath}`);
  }

  // Run Local AI Transcription (Demucs + faster-whisper + Translation)
  const localLyrics = await transcribeLocally(fullPath);
  console.log(`[Whisper Service] Successfully generated ${localLyrics.length} timestamped English lines using Demucs + Local AI!`);
  return localLyrics;
};

module.exports = {
  transcribeAudioToLyrics
};
