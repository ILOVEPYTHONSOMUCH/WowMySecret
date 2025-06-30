const express = require('express');
const auth = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');

const router = express.Router();

/**
 * POST /api/doquiz
 * ทำแบบทดสอบและบันทึกผล
 * body: { quizId: String, answers: [{ questionId: String, given: String }] }
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { quizId, answers } = req.body;
    if (!quizId || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'quizId และ answers ต้องถูกต้อง' });
    }

    const quiz = await Quiz.findOne({ quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Calculate score
    let score = 0;
    quiz.questions.forEach(q => {
      const a = answers.find(x => x.questionId === q._id.toString());
      if (a && a.given === q.answer) score++;
    });

    // Record attempt
    const attempt = new QuizAttempt({ quiz: quiz._id, user: req.user._id, answers, score });
    await attempt.save();

    // Update quiz attempts count
    quiz.attemptsCount = (quiz.attemptsCount || 0) + 1;
    await quiz.save();

    // Update user's totalScore and quizScores
    const user = await User.findById(req.user._id);
    user.totalScore = (user.totalScore || 0) + score;
    const existing = user.quizScores.find(qs => qs.quizId.toString() === quiz._id.toString());
    if (existing) {
      existing.score = score;
    } else {
      user.quizScores.push({ quizId: quiz._id, score });
    }
    await user.save();

    res.json({ score, total: quiz.questionsCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;