const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const Post = require('../models/Post');

// Create Post
router.post('/', auth, multer.fields([{ name: 'image' }, { name: 'video' }]), async (req, res, next) => {
  try {
    const { title, description, teachSubjects, learnSubjects } = req.body;
    const post = new Post({
      user: req.user.id,
      title,
      description,
      teachSubjects: teachSubjects ? JSON.parse(teachSubjects) : [],
      learnSubjects: learnSubjects ? JSON.parse(learnSubjects) : [],
      image: req.files.image?.[0].path,
      video: req.files.video?.[0].path
    });
    await post.save();
    res.json(post);
  } catch (err) { next(err); }
});

// List
router.get('/', async (req, res, next) => {
  try { res.json(await Post.find()); } catch (err) { next(err); }
});

// Search
router.get('/search', async (req, res, next) => {
    try {
        const q = req.query.q;
        const posts = await Post.find({ $text: { $search: q } });
        res.json(posts);
    } catch (err) { next(err); }
});

module.exports = router;