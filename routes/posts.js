const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const router = express.Router();

// Create post
router.post('/', auth, async (req, res) => {
  const post = new Post({ author: req.user._id, content: req.body.content });
  await post.save();
  res.json(post);
});

// Get all posts
router.get('/', auth, async (req, res) => {
  const posts = await Post.find().populate('author', 'name');
  res.json(posts);
});

module.exports = router;