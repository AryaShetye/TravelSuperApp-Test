/**
 * File Upload Middleware
 * Uses multer with memory storage — files are uploaded to Cloudinary
 * from the service layer, not saved to disk
 */

const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 10,
  },
});

/**
 * Must be a 4-argument function so Express treats it as an error handler.
 * Place AFTER the multer middleware in the route chain.
 */
// eslint-disable-next-line no-unused-vars
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5 MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 images.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err?.message?.includes('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }

  next(err);
}

module.exports = { upload, handleUploadError };
