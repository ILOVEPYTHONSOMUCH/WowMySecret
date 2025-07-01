const express = require('express');
const router = express.Router();
const multer = require('../config/multerConfig');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const { mkdirRecursive } = require('../utils/mkdirRecursive');

// Create Post
router.post('/', auth, multer.any(), async (req, res, next) => {
  try {
    const { title, description, teachSubjects, learnSubjects, userId } = req.body;

    const post = new Post({
      title,
      description,
      teachSubjects: JSON.parse(teachSubjects || '[]'),
      learnSubjects: JSON.parse(learnSubjects || '[]'),
      user: req.user.id,
    });

    const imageFile = req.files?.find(f => f.fieldname === 'image');
    const videoFile = req.files?.find(f => f.fieldname === 'video');

    if (imageFile) post.image = imageFile.path;
    if (videoFile) post.video = videoFile.path;

    const saved = await post.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// List Posts
router.get('/', async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// Search Posts
/*
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    const regex = new RegExp(q, 'i');
    const posts = await Post.find({
      $or: [
        { title: regex },
        { description: regex },
        { teachSubjects: regex },
        { learnSubjects: regex }
      ]
    });
    res.json(posts);
  } catch (err) {
    next(err);
  }
});
*/
module.exports = router;
