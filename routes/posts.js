// server/routes/posts.js
const express = require('express');
const router = express.Router();
const multer = require('../utils/multerConfig');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

/**
 * POST /api/posts
 * สร้างโพสต์ใหม่พร้อม title, content และไฟล์รูป/วิดีโอ (optional)
 * - title (text, required)
 * - content (text, required)
 * - image (file) [opt]
 * - video (file) [opt]
 */
router.post(
  '/',
  auth,
  multer.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const { title, content } = req.body;
      if (!title || !content) return res.status(400).json({ message: 'กรุณาระบุ title และ content' });

      const imageFile = req.files?.image?.[0];
      const videoFile = req.files?.video?.[0];

      const post = new Post({
        title,
        author: req.user._id,
        content,
        image: imageFile ? `/uploads/posts/${imageFile.filename}` : null,
        video: videoFile ? `/uploads/videos/${videoFile.filename}` : null
      });

      await post.save();
      res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/posts
 * ดึง feed ทั้งหมด (sorted by date desc)
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name avatar')
      .sort('-createdAt');
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/posts/search?q=keyword
 * ค้นหาโพสต์จาก title หรือ content
 */
router.get('/search', auth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'กรุณาระบุ q ใน query' });
    }

    const posts = await Post.find({
      $or: [
        { title:   { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } }
      ]
    }).populate('author', 'name avatar');

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
