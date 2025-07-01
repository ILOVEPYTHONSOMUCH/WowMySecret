const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');

// Watch & React
router.post('/', auth, async (req, res, next) => {
  try {
    const { lessonId, postId, like, dislike } = req.body;
    if (lessonId) {
      const lesson = await Lesson.findOne({ lessonId });
      lesson.viewsCount++;
      if (like) lesson.likesCount++;
      if (dislike) lesson.dislikesCount++;
      await lesson.save();
      return res.json(lesson);
    }
    res.status(400).json({ message: 'Invalid request' });
  } catch (err) { next(err); }
});

module.exports = router;