const express = require('express');
const router = express.Router();
const multer = require('../config/multerConfig');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const { mkdirRecursive } = require('../utils/mkdirRecursive');

// Create Post
router.post('/', auth, multer.any(), async (req, res, next) => {
  try {
    // Destructure the fields you expect:
    // - title, description (strings)
    // - teachSubjects & learnSubjects as JSON‐strings
    // - grade as a string (we'll parseInt)
    const {
      title,
      description,
      teachSubjects,
      learnSubjects,
      grade
    } = req.body;

    // Validate required fields
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }
    if (typeof grade === 'undefined') {
      return res.status(400).json({ message: 'Grade is required.' });
    }
    const gradeInt = parseInt(grade, 10);
    if (isNaN(gradeInt)) {
      return res.status(400).json({ message: 'Grade must be a number.' });
    }

    // Build the Post document
    const post = new Post({
      title,
      description,
      teachSubjects: JSON.parse(teachSubjects || '[]'),
      learnSubjects: JSON.parse(learnSubjects || '[]'),
      grade: gradeInt,
      user: req.user.id,             // owner from JWT
    });

    // Attach any uploaded image/video
    const imageFile = req.files.find(f => f.fieldname === 'image');
    const videoFile = req.files.find(f => f.fieldname === 'video');
    if (imageFile) post.image = imageFile.path;
    if (videoFile) post.video = videoFile.path;

    // Save and return
    const saved = await post.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// List Posts
/*
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
