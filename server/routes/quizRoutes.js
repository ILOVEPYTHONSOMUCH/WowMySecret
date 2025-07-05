const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const { nanoid } = require('nanoid');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

/**
 * Create Quiz
 * - Requires: title, subject, grade, questions (stringified JSON array)
 * - Optional files: coverImage, questionImage_<index>
 */
router.post(
  '/',
  auth,
  multer.any(),
  async (req, res, next) => {
    try {
      const { title, subject, grade, questions } = req.body;
      if (!title || !subject || !grade || !questions) {
        return res.status(400).json({ message: 'title, subject, grade, and questions are required' });
      }
      const parsed = JSON.parse(questions);

      // Map files by field name
      const filesMap = {};
      (req.files || []).forEach(f => {
        filesMap[f.fieldname] = f.path;
      });

      // Build questions with optional imagePath
      const questionsWithImages = parsed.map((q, idx) => {
        const obj = { question: q.question, options: q.options, answer: q.answer };
        const imgKey = `questionImage_${idx}`;
        if (filesMap[imgKey]) {
          obj.imagePath = filesMap[imgKey];
        }
        return obj;
      });

      const quiz = new Quiz({
        quizId: nanoid(8),
        user: req.user.id,
        title,
        subject,
        grade,
        questions: questionsWithImages,
        ...(filesMap.coverImage && { coverImage: filesMap.coverImage })
      });

      await quiz.save();
      res.json(quiz);
    } catch (err) {
      next(err);
    }
  }
);

// List all quizzes
router.get('/', async (req, res, next) => {
  try {
    const quizzes = await Quiz.find();
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
});

// Get quiz by quizId
router.get('/:quizId', async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
});

// Submit an attempt
router.post('/:quizId/attempt', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const { answers } = req.body;
    let score = 0;
    answers.forEach(a => {
      if (quiz.questions[a.questionIndex].answer === a.given) score++;
    });

    const attempt = new QuizAttempt({ quiz: quiz._id, user: req.user.id, score, answers });
    await attempt.save();

    // Update stats
    quiz.attemptsCount++;
    await quiz.save();

    const user = await User.findById(req.user.id);
    user.totalScore += score;
    user.attemptsCount++;
    user.quizScores.push({ quizId: quiz.quizId, score });
    await user.save();

    res.json({ score });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
