const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const Comment = require('../models/Comment');

// Add Comment
router.post('/:postId/comments', auth, multer.single('media'), async (req, res, next) => {
  try {
    const comment = new Comment({
      post: req.params.postId,
      user: req.user.id,
      msg: req.body.msg,
      media: req.file?.path
    });
    await comment.save();
    res.json(comment);
  } catch (err) { next(err); }
});

// List Comments
router.get('/:postId/comments', async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId });
    res.json(comments);
  } catch (err) { next(err); }
});

module.exports = router;