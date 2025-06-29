// server/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const auth = require('../middleware/auth');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest;
    if (file.fieldname === 'quizImage') dest = 'uploads/quizzes';
    else if (file.fieldname.startsWith('questionImage_')) dest = 'uploads/quizzes/questions';
    else dest = 'uploads/quizzes';
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Create Quiz endpoint
// Expects multipart/form-data with title, questions (JSON string), quizImage, questionImage_<index>
router.post('/', auth, upload.any(), async (req, res) => {
  try {
    const { title } = req.body;
    const questions = JSON.parse(req.body.questions);
    // find quizImage file
    const quizFile = req.files.find(f => f.fieldname === 'quizImage');
    const quizImage = quizFile ? `/uploads/quizzes/${quizFile.filename}` : null;
    
    // map question images
    const questionImages = {};
    req.files.forEach(f => {
      if (f.fieldname.startsWith('questionImage_')) {
        const idx = f.fieldname.split('_')[1];
        questionImages[idx] = `/uploads/quizzes/questions/${f.filename}`;
      }
    });
    // attach image to each question
    const finalQuestions = questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      image: questionImages[i] || null
    }));

    const quiz = new Quiz({ title, questions: finalQuestions, image: quizImage, createdBy: req.user._id });
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all quizzes
router.get('/', auth, async (req, res) => {
  const quizzes = await Quiz.find().select('title image createdAt').populate('createdBy','name');
  res.json(quizzes);
});

// Get single quiz (with questions)
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy','name');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch {
    res.status(400).json({ error: 'Invalid quiz ID' });
  }
});

// Submit answers (attempt quiz)
router.post('/:id/attempt', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    const answers = req.body.answers; // [{ questionId, given }]
    let score = 0;
    quiz.questions.forEach(q => {
      const ans = answers.find(a => a.questionId === q._id.toString());
      if (ans && ans.given === q.answer) score++;
    });
    const attempt = new QuizAttempt({ quiz: quiz._id, user: req.user._id, answers, score });
    await attempt.save();
    res.json({ score, total: quiz.questions.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get attempts for user on this quiz
router.get('/:id/attempts', auth, async (req, res) => {
  const attempts = await QuizAttempt.find({ quiz: req.params.id, user: req.user._id }).sort('-takenAt');
  res.json(attempts);
});

module.exports = router;
