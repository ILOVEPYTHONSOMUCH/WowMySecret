const express = require('express');
const router = express.Router();
const Lesson = require('../models/lesson');
const auth = require('../middleware/auth');
const { uploadLesson } = require('../middleware/upload');

// Create lesson
router.post('/', auth, uploadLesson.single('video'), async (req, res) => {
  try {
    const { title, subject, description, quizId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Video is required' });
    const lesson = new Lesson({
      title,
      video: req.file.path,
      subject,
      description,
      quiz: quizId,
      owner: req.user._id
    });
    await lesson.save();
    res.json({ message: 'Lesson created', lessonId: lesson._id });
  } catch (err) {
    res.status(400).json({ message: 'Lesson creation failed', error: err.message });
  }
});

// Get all lessons
router.get('/', auth, async (req, res) => {
  const lessons = await Lesson.find().populate('owner', 'username');
  res.json(lessons);
});

// Get single lesson
router.get('/:lessonId', auth, async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
  res.json(lesson);
});

// Update view count
router.post('/:lessonId/view', auth, async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
  lesson.viewsCount += 1;
  await lesson.save();
  res.json({ message: 'View recorded' });
});

// Like a lesson
router.post('/:lessonId/like', auth, async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
  lesson.likesCount += 1;
  await lesson.save();
  res.json({ message: 'Liked' });
});

// Dislike a lesson
router.post('/:lessonId/dislike', auth, async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
  lesson.dislikesCount += 1;
  await lesson.save();
  res.json({ message: 'Disliked' });
});

module.exports = router;
