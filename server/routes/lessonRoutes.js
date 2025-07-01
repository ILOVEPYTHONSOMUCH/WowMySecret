const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const { nanoid } = require('nanoid');
const Lesson = require('../models/Lesson');

// Create Lesson
router.post('/', auth, multer.single('video'), async (req, res, next) => {
  try {
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
  } catch (err) { next(err); }
});

// List
router.get('/', async (req, res, next) => {
  try { res.json(await Lesson.find()); } catch (err) { next(err); }
});

// Detail
router.get('/:lessonId', async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({ lessonId: req.params.lessonId });
    res.json(lesson);
  } catch (err) { next(err); }
});

module.exports = router;