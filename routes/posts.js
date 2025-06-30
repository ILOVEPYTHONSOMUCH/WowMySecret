// server/routes/posts.js
const express = require('express');
const router = express.Router();
const multer = require('../utils/multerConfig');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

router.post(
  '/',
  auth,
  multer.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const { title, description, teachSubjects, learnSubjects } = req.body;
      if (!title || !description) {
        return res.status(400).json({ message: 'กรุณาระบุ title และ description' });
      }
      const post = new Post({
        title,
        description,
        teachSubjects: teachSubjects ? JSON.parse(teachSubjects) : [],
        learnSubjects: learnSubjects ? JSON.parse(learnSubjects) : [],
        media: {
          image: req.files?.image?.[0]?.filename ? `/uploads/posts/${req.files.image[0].filename}` : null,
          video: req.files?.video?.[0]?.filename ? `/uploads/videos/${req.files.video[0].filename}` : null
        },
        owner: req.user._id
      });
      await post.save();
      res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  }
);

// ดึงโพสต์ทั้งหมด หรือแยกตาม owner, subject ฯลฯ
router.get('/', auth, async (req, res, next) => {
  try {
    const posts = await Post.find()
      .populate('owner', 'username avatar')
      .sort('-createdAt');
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
