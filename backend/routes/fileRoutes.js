const express = require('express');
const router = express.Router();
const { upload, getFileUrl } = require('../config/storage');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/upload', authMiddleware, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = getFileUrl(req, req.file.filename);
    return res.json({
      success: true,
      message: 'File uploaded successfully',
      filename: req.file.filename,
      url: fileUrl,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
