// server/routes/comments.js
const express = require('express');
const router = express.Router();
const multer = require('../utils/multerConfig');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// POST /api/posts/:postId/comments
router.post(
  '/:postId/comments',
  auth,
  multer.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const { msg } = req.body;
      if (!msg) return res.status(400).json({ message: 'กรุณาระบุข้อความ' });
      const comment = new Comment({
        msg,
        media: {
          image: req.files?.image?.[0]?.filename ? `/uploads/posts/${req.files.image[0].filename}` : null,
          video: req.files?.video?.[0]?.filename ? `/uploads/videos/${req.files.video[0].filename}` : null
        },
        owner: req.user._id,
        post: req.params.postId
      });
      await comment.save();
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/posts/:postId/comments
router.get('/:postId/comments', auth, async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('owner', 'username avatar')
      .sort('createdAt');
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
