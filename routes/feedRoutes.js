const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const Quiz = require('../models/quiz');
const Lesson = require('../models/lesson');
const auth = require('../middleware/auth');

// Feed posts
router.get('/posts', auth, async (req, res) => {
  const user = req.user;
  const learnSubs = user.skills.strengths || [];
  const teachSubs = user.skills.weaknesses || [];
  // Show posts where others teach subjects user wants to learn, or others want to learn subjects user teaches
  const posts = await Post.find({
    $or: [
      { teachSubjects: { $in: learnSubs } },
      { learnSubjects: { $in: teachSubs } }
    ]
  }).populate('owner', 'username');
  res.json(posts);
});

// Feed quizzes
router.get('/quizzes', auth, async (req, res) => {
  const user = req.user;
  const learnSubs = user.skills.strengths || [];
  const teachSubs = user.skills.weaknesses || [];
  // We don't have subject field on quiz; assume include in title or skip filtering by subjects.
  const quizzes = await Quiz.find({ owner: { $ne: user._id } }).populate('owner', 'username');
  res.json(quizzes);
});

// Feed lessons
router.get('/lessons', auth, async (req, res) => {
  const user = req.user;
  const learnSubs = user.skills.strengths || [];
  const teachSubs = user.skills.weaknesses || [];
  const lessons = await Lesson.find({
    $or: [
      { subject: { $in: learnSubs } },
      { subject: { $in: teachSubs } }
    ]
  }).populate('owner', 'username');
  res.json(lessons);
});

module.exports = router;
