const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const { nanoid } = require('nanoid');
const Lesson = require('../models/Lesson');

/**
 * Create Lesson
 *
 * - Expects fields:
 *     title, subject, description, relatedQuizzes (JSON stringified array)
 * - Requires exactly one `video` file upload
 */
router.post('/', auth, multer.single('video'), async (req, res, next) => {
  try {
    // Enforce video upload
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required for lessons.' });
    }

    const { title, subject, description, relatedQuizzes } = req.body;

    const lesson = new Lesson({
      lessonId: nanoid(8),
      user: req.user.id,
      title,
      subject,
      description,
      relatedQuizzes: relatedQuizzes ? JSON.parse(relatedQuizzes) : [],
      video: req.file.path
    });

    await lesson.save();
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});

/*
// List Lessons
router.get('/', async (req, res, next) => {
  try {
    const list = await Lesson.find();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// Lesson detail
router.get('/:lessonId', async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({ lessonId: req.params.lessonId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});
*/
module.exports = router;
