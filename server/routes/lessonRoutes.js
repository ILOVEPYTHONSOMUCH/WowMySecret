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
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required for lessons.' });
    }

    const { title, subject, description, relatedQuizzes, grade } = req.body;

    // ✅ Check for grade
    if (!grade || isNaN(grade)) {
      return res.status(400).json({ message: 'Grade is required and must be a number.' });
    }

    const lesson = new Lesson({
      lessonId: nanoid(8),
      user: req.user.id,
      title,
      subject,
      description,
      relatedQuizzes: relatedQuizzes ? JSON.parse(relatedQuizzes) : [],
      video: req.file.path,
      grade: parseInt(grade, 10) // ✅ Store grade as number
    });

    await lesson.save();
    res.status(201).json({ message: 'Lesson created successfully', lesson });
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
