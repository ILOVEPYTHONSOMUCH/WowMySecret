const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const path = require('path');
const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Upload video
router.post('/', auth, upload.single('video'), async (req, res) => {
  const video = new Video({ uploader: req.user._id, filename: req.file.filename, url: `/uploads/${req.file.filename}` });
  await video.save();
  res.json(video);
});

// Get videos
router.get('/', auth, async (req, res) => {
  const videos = await Video.find().populate('uploader', 'name');
  res.json(videos);
});

module.exports = router;