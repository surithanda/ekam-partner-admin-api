const multer = require('multer');

// ── Memory storage — file kept in buffer, never written to disk ──
const storage = multer.memoryStorage();

// ── File filter — accept only images ──
function imageFileFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed.'), false);
  }
}

/**
 * Multer middleware for single image upload.
 * Field name: "photo"
 * Max file size: 5 MB
 */
const uploadPhoto = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
}).single('photo');

/**
 * Express middleware wrapper with friendly error handling.
 */
function handlePhotoUpload(req, res, next) {
  uploadPhoto(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: { message: 'Image must be under 5 MB.' } });
      }
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
    if (err) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No image file provided. Field name must be "photo".' } });
    }
    next();
  });
}

module.exports = { handlePhotoUpload };
