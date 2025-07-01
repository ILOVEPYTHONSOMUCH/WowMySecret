const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const { nanoid } = require('nanoid');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

// Create Quiz
router.post('/', auth, multer.fields([{ name: 'coverImage' }, { name: 'questionImage_0' }]), async (req, res, next) => {
  try {
    const { title, subject, questions } = req.body;
    const parsed = JSON.parse(questions);
    const quiz = new Quiz({
      quizId: nanoid(8),
      user: req.user.id,
      title,
      subject,
      questions: parsed,
      coverImage: req.files.coverImage?.[0].path
    });
    await quiz.save();
    res.json(quiz);
  } catch (err) { next(err); }
});

// List
router.get('/', async (req, res, next) => {
  try { res.json(await Quiz.find()); } catch (err) { next(err); }
});

// Detail
router.get('/:quizId', async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    res.json(quiz);
  } catch (err) { next(err); }
});

// Attempt
router.post('/:quizId/attempt', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    const { answers } = req.body;
    let score = 0;
    answers.forEach((a, i) => { if (quiz.questions[i].answer === a.given) score++; });
    const attempt = new QuizAttempt({ quiz: quiz._id, user: req.user.id, score, answers });
    quiz.attemptsCount++;
    await quiz.save();
    const user = await User.findById(req.user.id);
    user.totalScore += score;
    user.attemptsCount++;
    user.quizScores.push({ quizId: quiz.quizId, score });
    await user.save();
    await attempt.save();
    res.json({ score });
  } catch (err) { next(err); }
});

module.exports = router;