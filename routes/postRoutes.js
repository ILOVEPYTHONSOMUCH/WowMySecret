const express = require('express');
const router = express.Router();
const multer = require('multer');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/posts');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const post = new Post({
      author: req.user._id,
      content: req.body.content,
      image: req.file ? `/uploads/posts/${req.file.filename}` : null
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;