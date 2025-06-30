const express = require('express');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multerConfig = require('../utils/multerConfig');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

// Conditional upload for multipart/form-data (quiz cover + question images)
const conditionalUpload = (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) {
    return multerConfig.any()(req, res, next);
  }
  next();
};

// POST /api/quizzes/ - Create a new quiz
router.post('/', auth, conditionalUpload, async (req, res, next) => {
  try {
    const { title, subjectTag, questions } = req.body;
    if (!title || !subjectTag || !questions) {
      return res.status(400).json({ message: 'Title, subjectTag and questions are required' });
    }
    // Parse questions JSON
    const parsedQs = typeof questions === 'string' ? JSON.parse(questions) : questions;

    // Handle uploaded files
    const files = req.files || [];
    // Cover image
    const quizFile = files.find(f => f.fieldname === 'quizImage');
    const quizImage = quizFile ? `/uploads/quizzes/${quizFile.filename}` : null;
    // Question images map
    const qImages = {};
    files.forEach(f => {
      if (f.fieldname.startsWith('questionImage_')) {
        const idx = f.fieldname.split('_')[1];
        qImages[idx] = `/uploads/quizzes/questions/${f.filename}`;
      }
    });

    // Build final questions
    const finalQuestions = parsedQs.map((q, i) => ({
      text: q.text,
      imageUrl: qImages[i] || q.imageUrl || null,
      options: q.options,
      answerKey: q.answerKey
    }));

    const quiz = new Quiz({
      title,
      subjectTag,
      owner: req.user._id,
      questions: finalQuestions
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/ - List all quizzes
router.get('/', auth, async (req, res, next) => {
  try {
    const list = await Quiz.find()
      .select('title subjectTag image createdBy questionCount takerCount totalScore createdAt')
      .populate('owner', 'name');
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id - Retrieve single quiz
router.get('/:id', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('owner', 'name');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
});

// POST /api/quizzes/:id/attempt - Submit answers
router.post('/:id/attempt', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const answers = req.body.answers;
    let score = 0;
    quiz.questions.forEach(q => {
      const ans = answers.find(a => a.questionId === q._id.toString());
      if (ans && ans.given === q.answerKey) score++;
    });

    // Save attempt
    const attempt = new QuizAttempt({
      quiz: quiz._id,
      user: req.user._id,
      answers,
      score
    });
    await attempt.save();

    // Update takerCount and user totalScore
    quiz.takerCount++;
    await quiz.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalScore: score } });

    res.json({ score, total: quiz.totalScore });
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id/attempts - User's attempt history
router.get('/:id/attempts', auth, async (req, res, next) => {
  try {
    const atts = await QuizAttempt.find({ quiz: req.params.id, user: req.user._id })
      .sort('-takenAt');
    res.json(atts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
