const express = require('express');
const router = express.Router();
const Quiz = require('../models/quiz');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { uploadQuizCover } = require('../middleware/upload');

// Create quiz — Multer only when Content‑Type is multipart
router.post('/', auth, async (req, res, next) => {
  if (req.is('multipart/form-data')) {
    // ถ้ามีไฟล์ เข้าสู่ multer
    uploadQuizCover.single('coverImage')(req, res, err => {
      if (err) return next(err);
      next();
    });
  } else {
    // ไม่มีไฟล์ เลยข้าม multer
    next();
  }
}, async (req, res) => {
  try {
    let { title, questions } = req.body;
    if (typeof questions === 'string') questions = JSON.parse(questions);
    const quiz = new Quiz({
      title,
      coverImage: req.file?.path,
      questions,
      owner: req.user._id
    });
    await quiz.save();
    res.json({ message: 'Quiz created', quizId: quiz._id });
  } catch (err) {
    res.status(400).json({ message: 'Quiz creation failed', error: err.message });
  }
});


// Attempt quiz
router.post('/:quizId/attempt', auth, async (req, res) => {
  try {
    const { answers } = req.body; // answers as array of chosen indices
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    let score = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] == q.answer) score++;
    });
    // Update quiz attempts
    quiz.attemptsCount += 1;
    await quiz.save();
    // Update user scores
    const user = await User.findById(req.user._id);
    user.totalScore += score;
    user.attemptsCount += 1;
    user.quizScores.push({ quiz: quiz._id, score });
    await user.save();
    res.json({ message: 'Quiz submitted', score });
  } catch (err) {
    res.status(400).json({ message: 'Quiz attempt failed', error: err.message });
  }
});

// Get all quizzes
router.get('/', auth, async (req, res) => {
  const quizzes = await Quiz.find().populate('owner', 'username');
  res.json(quizzes);
});

// Get single quiz
router.get('/:quizId', auth, async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  res.json(quiz);
});

module.exports = router;
