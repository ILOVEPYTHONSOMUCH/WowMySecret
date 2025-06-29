const express = require('express');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const router = express.Router({ mergeParams: true });

// Create comment
router.post('/:postId/comments', auth, async (req, res) => {
  const comment = new Comment({ post: req.params.postId, author: req.user._id, text: req.body.text });
  await comment.save();
  res.json(comment);
});

// Get comments for a post
router.get('/:postId/comments', auth, async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId }).populate('author', 'name');
  res.json(comments);
});

module.exports = router;