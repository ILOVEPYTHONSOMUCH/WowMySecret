// server/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const { nanoid } = require('nanoid');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

router.post(
  '/',
  auth,
  multer.any(),  // accept coverImage and questionImage_N files
  async (req, res, next) => {
    try {
      const { title, subject, questions } = req.body;
      const parsed = JSON.parse(questions);

      // Build a map filename → path
      const filesMap = {};
      (req.files || []).forEach(f => {
        filesMap[f.fieldname] = f.path;
      });

      // Attach imagePath if present for each question
      const questionsWithImages = parsed.map((q, idx) => {
        const qObj = {
          question: q.question,
          options: q.options,
          answer: q.answer
        };
        const imgKey = `questionImage_${idx}`;
        if (filesMap[imgKey]) {
          qObj.imagePath = filesMap[imgKey];
        }
        return qObj;
      });

      const quiz = new Quiz({
        quizId: nanoid(8),
        user: req.user.id,
        title,
        subject,
        questions: questionsWithImages,
        // optional cover image
        ...(filesMap.coverImage && { coverImage: filesMap.coverImage })
      });

      await quiz.save();
      res.json(quiz);
    } catch (err) {
      next(err);
    }
  }
);

// ... the rest of your routes remain the same ...

module.exports = router;
