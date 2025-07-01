const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');

// Get all relevant info (posts, lessons, quizzes) based on user's grade and skills
router.get('/info', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const grade = user.grade;
    const strengths = user.skills.strengths || [];
    const weaknesses = user.skills.weaknesses || [];

    // Posts related to user's skills (teach or learn)
    const posts = await Post.find({
      $or: [
        { teachSubjects: { $in: weaknesses } },
        { learnSubjects: { $in: strengths } },
        { teachSubjects: { $in: strengths } },
        { learnSubjects: { $in: weaknesses } }
      ]
    });

    // Lessons related to user's weaknesses or grade
    const lessons = await Lesson.find({
      $or: [
        { subject: { $in: weaknesses } },
        { grade: grade } // if you store grade in Lesson model
      ]
    });

    // Quizzes related to user's weaknesses or grade
    const quizzes = await Quiz.find({
      $or: [
        { subject: { $in: weaknesses } },
        { grade: grade } // if you store grade in Quiz model
      ]
    });

    res.json({ posts, lessons, quizzes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
