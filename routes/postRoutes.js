const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const Comment = require('../models/comment');
const auth = require('../middleware/auth');
const { uploadPostMedia, uploadComment } = require('../middleware/upload');

// Create post
router.post('/', auth, async (req, res, next) => {
  if (req.is('multipart/form-data')) {
    uploadPostMedia.single('media')(req, res, err => {
      if (err) return next(err);
      next();
    });
  } else next();
}, async (req, res) => {
  try {
    const { title, content, teachSubjects, learnSubjects } = req.body;
    // ถ้า req.body มาจาก JSON จะถูก parse ด้วย express.json()
    const post = new Post({
      title,
      content,
      media: req.file?.path,
      teachSubjects: teachSubjects?.split(',') || [],
      learnSubjects: learnSubjects?.split(',') || [],
      owner: req.user._id
    });
    await post.save();
    res.json({ message: 'Post created', postId: post._id });
  } catch (err) {
    res.status(400).json({ message: 'Post creation failed', error: err.message });
  }
});
// Get all posts
router.get('/', auth, async (req, res) => {
  const posts = await Post.find().populate('owner', 'username');
  res.json(posts);
});

// Get single post
router.get('/:postId', auth, async (req, res) => {
  const post = await Post.findById(req.params.postId).populate('owner', 'username');
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json(post);
});

// Add comment to post
router.post('/:postId/comments', auth, uploadComment.single('media'), async (req, res) => {
  try {
    const { msg } = req.body;
    const comment = new Comment({
      msg,
      media: req.file ? req.file.path : undefined,
      owner: req.user._id,
      post: req.params.postId
    });
    await comment.save();
    res.json({ message: 'Comment added', commentId: comment._id });
  } catch (err) {
    res.status(400).json({ message: 'Comment failed', error: err.message });
  }
});

// Get comments for a post
router.get('/:postId/comments', auth, async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId }).populate('owner', 'username');
  res.json(comments);
});

module.exports = router;
