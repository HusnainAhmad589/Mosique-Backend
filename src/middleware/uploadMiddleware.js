const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const audioUploadDir = path.join(__dirname, '../../uploads/audio');
const artworkUploadDir = path.join(__dirname, '../../uploads/artwork');

if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}
if (!fs.existsSync(artworkUploadDir)) {
  fs.mkdirSync(artworkUploadDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      cb(null, audioUploadDir);
    } else if (file.fieldname === 'artwork' || file.fieldname === 'banner' || file.fieldname === 'avatar') {
      cb(null, artworkUploadDir);
    } else {
      cb(new Error('Unknown fieldname for upload'), false);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique name: timestamp-randomString.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize original name by replacing spaces and special chars
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

// File filters
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/wav') {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Only MP3 and WAV are allowed.'));
    }
  } else if (file.fieldname === 'artwork' || file.fieldname === 'banner' || file.fieldname === 'avatar') {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPG, PNG, and WEBP are allowed.'));
    }
  } else {
    cb(new Error('Unknown fieldname for upload'));
  }
};

// Multer instances with specific limits
const uploadAudio = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB
  }
});

const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

module.exports = {
  uploadAudio,
  uploadImage
};
