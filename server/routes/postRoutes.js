const express = require('express');
const router = express.Router();
const multer = require('../config/multerConfig');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// Create Post
router.post('/', auth, multer.any(), async (req, res, next) => {
  try {
    // Destructure the fields you expect:
    const { title, description, teachSubjects, learnSubjects, grade } = req.body;

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

    // Confirm authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing.' });
    }

    // Build the Post document
    const post = new Post({
      title,
      description,
      teachSubjects: JSON.parse(teachSubjects || '[]'),
      learnSubjects: JSON.parse(learnSubjects || '[]'),
      grade: gradeInt,
      user: userId,             // owner from JWT
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

module.exports = router;
