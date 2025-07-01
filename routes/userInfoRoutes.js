const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/user');
const QuizAttempt = require('../models/QuizAttempt');

const router = express.Router();

/**
 * GET /api/userinfo/:userId
 * คืนข้อมูลผู้ใช้: username, email, quizScores, totalScore
 */
router.get('/:userId', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username email quizScores totalScore');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Optionally, join with attempts count
    const attempts = await QuizAttempt.find({ user: user._id }).countDocuments();

    res.json({
      username: user.username,
      email: user.email,
      quizScores: user.quizScores,
      totalScore: user.totalScore,
      attemptsCount: attempts
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
