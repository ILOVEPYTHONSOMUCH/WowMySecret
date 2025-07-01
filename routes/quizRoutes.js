// server/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const { uploadQuizCover } = require('../middleware/upload');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const auth = require('../middleware/auth');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

/**
 * POST /api/quizzes
 * สร้าง quiz ใหม่
 */
router.post(
  '/',
  auth,
  uploadQuizCover.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'questionImages', maxCount: 20 }
  ]),
  async (req, res, next) => {
    try {
      const { title, questions, subject } = req.body;
      if (!title || !questions || !subject) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      let parsed;
      try {
        parsed = JSON.parse(questions);
        if (!Array.isArray(parsed)) throw new Error();
      } catch {
        return res.status(400).json({ message: 'Invalid questions format' });
      }
      const files = req.files || [];
      const cover = files.coverImage ? files.coverImage[0] : null;
      const coverUrl = cover ? `/uploads/quizcovers/${cover.filename}` : null;
      const qImgs = files.questionImages || [];
      const questionList = parsed.map((q, idx) => {
        const img = qImgs[idx];
        return {
          question: q.question,
          options: q.options,
          answer: q.answer,
          image: img ? `/uploads/quizcovers/${img.filename}` : null
        };
      });
      const quiz = new Quiz({
        quizId: nanoid(),
        title,
        coverImage: coverUrl,
        questions: questionList,
        subject,
        owner: req.user._id
      });
      await quiz.save();
      res.status(201).json({ quizId: quiz.quizId });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET quiz by quizId
 */
router.get('/:quizId', auth, async (req, res, next) => {
  try {
    const { quizId } = req.params;
    if (!quizId) return res.status(400).json({ message: 'quizId is required' });
    const quiz = await Quiz.findOne({ quizId }).lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
});

/**
 * POST quiz attempt
 */
router.post('/:quizId/attempt', auth, async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    if (!quizId || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const quiz = await Quiz.findOne({ quizId }).lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    let score = 0;
    quiz.questions.forEach(q => {
      const ans = answers.find(a => a.questionId === q._id.toString());
      if (ans && ans.given === q.answer) score++;
    });
    await Quiz.updateOne({ quizId }, { $inc: { attemptsCount: 1 } });
    await new QuizAttempt({ quiz: quiz._id, user: req.user._id, answers, score }).save();
    res.json({ score, total: quiz.questions.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
