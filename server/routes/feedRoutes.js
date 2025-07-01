const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');
const User = require('../models/User');

// Feed Posts, Quizzes, Lessons based on skills
router.get('/posts', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const posts = await Post.find({ learnSubjects: { $in: user.skills.strengths } });
    res.json(posts);
  } catch (err) { next(err); }
});
router.get('/quizzes', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const quizzes = await Quiz.find({ subject: { $in: user.skills.weaknesses } });
    res.json(quizzes);
  } catch (err) { next(err); }
});
router.get('/lessons', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const lessons = await Lesson.find({ subject: { $in: user.skills.weaknesses } });
    res.json(lessons);
  } catch (err) { next(err); }
});

module.exports = router;