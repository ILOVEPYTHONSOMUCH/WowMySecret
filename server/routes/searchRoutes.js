const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const Post = require('../models/Post');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

function createRegexFilter(query) {
  return new RegExp(query, 'i');
}

// Unified search endpoint
router.get('/:type', async (req, res, next) => {
  const { type } = req.params;
  const { title, description, subject, username, email } = req.query;
  const filter = {};

  try {
    if (title) filter.title = createRegexFilter(title);
    if (description) filter.description = createRegexFilter(description);
    if (subject) filter.subject = createRegexFilter(subject);

    let results;

    switch (type) {
      case 'lessons':
        results = await Lesson.find(filter).populate('user', 'username');
        break;
      case 'posts':
        results = await Post.find(filter).populate('user', 'username');
        break;
      case 'quizzes':
        results = await Quiz.find(filter).populate('user', 'username');
        break;
      case 'users':
        if (username) filter.username = createRegexFilter(username);
        if (email) filter.email = createRegexFilter(email);
        results = await User.find(filter).select('-password');
        return res.json(results);
      default:
        return res.status(400).json({ error: 'Invalid search type' });
    }

    // Additional filter by username for populated user
    if (username && ['lessons', 'posts', 'quizzes'].includes(type)) {
      results = results.filter(item => item.user?.username?.toLowerCase().includes(username.toLowerCase()));
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;