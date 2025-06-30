const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/feed/posts
 * คืนโพสต์ที่สอดคล้องกับวิชาของผู้ใช้:
 *   - post.teachSubjects intersects user.learnSubjects
 *   - OR post.learnSubjects intersects user.teachSubjects
 */
router.get('/posts', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const learn = user.skills?.weaknesses || [];
    const teach = user.skills?.strengths || [];

    const posts = await Post.find({
      $or: [
        { teachSubjects: { $in: learn } },
        { learnSubjects: { $in: teach } }
      ]
    }).populate('owner', 'username avatar');

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/feed/quizzes
 * คืน quizzes ที่สอดคล้องกับวิชาของผู้ใช้ (subject)
 */
router.get('/quizzes', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const learn = user.skills?.weaknesses || [];
    const teach = user.skills?.strengths || [];

    const quizzes = await Quiz.find({
      subject: { $in: [...learn, ...teach] }
    }).populate('owner','username');

    res.json(quizzes);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/feed/lessons
 * คืน lessons ที่สอดคล้องกับวิชาของผู้ใช้
 */
router.get('/lessons', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const learn = user.skills?.weaknesses || [];
    const teach = user.skills?.strengths || [];

    const lessons = await Lesson.find({
      subject: { $in: [...learn, ...teach] }
    }).populate('owner','username');

    res.json(lessons);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
