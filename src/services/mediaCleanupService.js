'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Safely removes a file from the local uploads directory to prevent orphaned assets.
 * @param {string} relativePath - The stored relative path of the media asset.
 * @returns {boolean} - True if deleted, false otherwise.
 */
const deleteMediaFile = (relativePath) => {
  if (!relativePath) return false;

  try {
    // Normalize path by stripping leading slashes
    const cleanPath = relativePath.replace(/^[\/\\]+/, '');
    const absolutePath = path.join(__dirname, '../../', cleanPath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`[MediaCleanup] Deleted orphaned file: ${cleanPath}`);
      return true;
    }
  } catch (error) {
    console.error(`[MediaCleanup] Failed to delete file ${relativePath}:`, error.message);
  }

  return false;
};

module.exports = {
  deleteMediaFile,
};
