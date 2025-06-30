const express = require('express');
const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const Post = require('../models/Post');

const router = express.Router();

/**
 * POST /api/watch
 * บันทึกการดูเนื้อหา และ like/dislike
 * body: { postId?: String, lessonId?: String, like?: Boolean }
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { postId, lessonId, like } = req.body;
    let target;
    // Determine target content
    if (lessonId) {
      target = await Lesson.findOne({ lessonId });
    } else if (postId) {
      target = await Post.findById(postId);
      // ensure Post model has counters
      if (target && target.viewsCount === undefined) {
        target.viewsCount = 0;
        target.likesCount = target.likesCount || 0;
        target.dislikesCount = target.dislikesCount || 0;
      }
    }
    if (!target) return res.status(404).json({ message: 'Content not found' });

    // Increment views count
    target.viewsCount = (target.viewsCount || 0) + 1;
    // Handle like/dislike
    if (like === true) target.likesCount = (target.likesCount || 0) + 1;
    else if (like === false) target.dislikesCount = (target.dislikesCount || 0) + 1;

    await target.save();
    res.json({ message: 'Watch recorded', views: target.viewsCount, likes: target.likesCount, dislikes: target.dislikesCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;