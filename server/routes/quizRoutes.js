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
 *
 * - Expects fields:
 *     title, subject, questions (JSON stringified array)
 * - Optional files:
 *     coverImage
 *     questionImage_0, questionImage_1, ... questionImage_N
 */
router.post(
  '/',
  auth,
  // accept any files; we'll sort them by fieldname below
  multer.any(),
  async (req, res, next) => {
    try {
      const { title, subject, questions } = req.body;
      const parsedQuestions = JSON.parse(questions);

      // Build up questions array, attaching image path if uploaded
      const filesByField = {};
      (req.files || []).forEach(f => {
        filesByField[f.fieldname] = f.path;
      });

      const questionsWithImages = parsedQuestions.map((q, idx) => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        // if there's a file named `questionImage_<idx>`, attach its path
        ...(filesByField[`questionImage_${idx}`] && {
          imageIndex: idx,
          imagePath: filesByField[`questionImage_${idx}`]
        })
      }));

      const quiz = new Quiz({
        quizId: nanoid(8),
        user: req.user.id,
        title,
        subject,
        questions: questionsWithImages,
        // coverImage if provided
        ...(filesByField.coverImage && { coverImage: filesByField.coverImage })
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
    const list = await Quiz.find();
    res.json(list);
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

    const { answers } = req.body; // [{ questionIndex, given }, ...]
    let score = 0;
    answers.forEach(a => {
      if (quiz.questions[a.questionIndex].answer === a.given) score++;
    });

    // Record attempt
    const attempt = new QuizAttempt({
      quiz: quiz._id,
      user: req.user.id,
      score,
      answers
    });
    await attempt.save();

    // Update quiz & user stats
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
