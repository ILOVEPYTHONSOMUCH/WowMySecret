// server/routes/quizRoutes.js
const express = require('express');
const upload = require('../utils/multerConfig');    // Multer config for file uploads
const fs = require('fs');
const path = require('path');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/quizzes/
// Create a new quiz with optional cover image and per-question images.
// Expects multipart/form-data:
//  - title (string)
//  - questions (JSON stringified array: [{ question, options, answer }, ...])
//  - quizImage (file field)
//  - questionImage_<index> (file fields for each question)
router.post('/', auth, upload.any(), async (req, res, next) => {
  try {
    const { title, questions } = req.body;
    const parsedQs = JSON.parse(questions);

    // Cover image
    const quizFile = req.files.find(f => f.fieldname === 'quizImage');
    const quizImage = quizFile ? `/uploads/quizzes/${quizFile.filename}` : null;

    // Map question images by index
    const qImages = {};
    req.files.forEach(f => {
      if (f.fieldname.startsWith('questionImage_')) {
        const idx = f.fieldname.split('_')[1];
        qImages[idx] = `/uploads/quizzes/questions/${f.filename}`;
      }
    });

    // Build final questions array with images attached
    const finalQuestions = parsedQs.map((q, i) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      image: qImages[i] || null
    }));

    const quiz = new Quiz({
      title,
      questions: finalQuestions,
      image: quizImage,
      createdBy: req.user._id
    });
    await quiz.save();

    res.json(quiz);
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/
// List all quizzes (id, title, cover image, createdBy, createdAt)
router.get('/', auth, async (req, res, next) => {
  try {
    const list = await Quiz.find()
      .select('title image createdAt')
      .populate('createdBy', 'name');
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id
// Retrieve a single quiz with all its questions and images
router.get('/:id', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'name');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
});

// POST /api/quizzes/:id/attempt
// Submit answers to a quiz, calculate score, save attempt, and update user's totalScore
router.post('/:id/attempt', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const answers = req.body.answers; // [{ questionId, given }]
    let score = 0;
    quiz.questions.forEach(q => {
      const ans = answers.find(a => a.questionId === q._id.toString());
      if (ans && ans.given === q.answer) score++;
    });

    // Save attempt record
    const attempt = new QuizAttempt({
      quiz: quiz._id,
      user: req.user._id,
      answers,
      score
    });
    await attempt.save();

    // Increment user's totalScore
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalScore: score }
    });

    res.json({ score, total: quiz.questions.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id/attempts
// Get the authenticated user's history of attempts for this quiz
router.get('/:id/attempts', auth, async (req, res, next) => {
  try {
    const atts = await QuizAttempt.find({
      quiz: req.params.id,
      user: req.user._id
    }).sort('-takenAt');
    res.json(atts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
