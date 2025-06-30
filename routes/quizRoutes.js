const express = require('express');
const multer = require('../utils/multerConfig');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const auth = require('../middleware/auth');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

const router = express.Router();

// Create a new quiz
router.post('/', auth, multer.single('quizImage'), async (req, res, next) => {
  try {
    const { title, questions, totalScore, subject } = req.body;
    if (!title || !questions || !totalScore || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const qs = JSON.parse(questions);
    const wrapped = qs.map(q => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      image: q.image || null
    }));
    const quiz = new Quiz({
      quizId: nanoid(),
      title,
      coverImage: req.file ? `/uploads/quizzes/${req.file.filename}` : null,
      questions: wrapped,
      totalScore: parseInt(totalScore),
      subject,
      owner: req.user._id
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
});

// Get all quizzes
router.get('/', auth, async (req, res, next) => {
  try {
    const list = await Quiz.find().populate('owner','username');
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// Get quiz by quizId
router.get('/:quizId', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId }).populate('owner','username');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
});

// Submit quiz attempt
router.post('/:quizId/attempt', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const answers = req.body.answers; // [{questionId, given}]
    let score = 0;
    quiz.questions.forEach(q => {
      const a = answers.find(x => x.questionId === q._id.toString());
      if (a && a.given === q.answer) score++;
    });
    const attempt = new QuizAttempt({ quiz: quiz._id, user: req.user._id, answers, score });
    await attempt.save();
    quiz.attemptsCount++;
    await quiz.save();
    res.json({ score, total: quiz.totalScore });
  } catch (err) {
    next(err);
  }
});

// Get attempts of user for a quiz
router.get('/:quizId/attempts', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const atts = await QuizAttempt.find({ quiz: quiz._id, user: req.user._id }).sort('-takenAt');
    res.json(atts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
