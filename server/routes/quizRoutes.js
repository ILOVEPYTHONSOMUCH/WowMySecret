const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming your auth middleware path
const multer = require('../config/multerConfig'); // Assuming your multer config path
const { nanoid } = require('nanoid');
const Quiz = require('../models/Quiz'); // Assuming your Quiz model path
const QuizAttempt = require('../models/QuizAttempt'); // Assuming your QuizAttempt model path
const User = require('../models/User'); // Assuming your User model path

/**
 * @route POST api/quizzes
 * @desc Create a new quiz
 * @access Private
 * - Requires: title, subject, grade, questions (stringified JSON array)
 * - Optional files: coverImage, questionImage_<index>
 */
router.post(
  '/',
  auth, // Protects the route, adds req.user.id
  multer.any(), // Handles multipart/form-data, including files and text fields
  async (req, res, next) => {
    try {
      const { title, subject, grade, questions } = req.body;

      // Basic validation for required text fields
      if (!title || !subject || !grade || !questions) {
        return res.status(400).json({ message: 'Title, subject, grade, and questions are required.' });
      }

      // Parse the JSON string of questions
      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(questions);
        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
          return res.status(400).json({ message: 'Questions must be a non-empty array.' });
        }
      } catch (e) {
        console.error('Error parsing questions JSON:', e);
        return res.status(400).json({ message: 'Invalid questions format. Must be a valid JSON array.' });
      }

      // Map uploaded files by their field name (e.g., 'coverImage', 'questionImage_0')
      const filesMap = {};
      (req.files || []).forEach(f => {
        filesMap[f.fieldname] = f.path; // Multer saves the file and provides its path
      });

      // Integrate image paths into the questions array
      const questionsWithImages = parsedQuestions.map((q, idx) => {
        const obj = { question: q.question, options: q.options, answer: q.answer };
        const imgKey = `questionImage_${idx}`; // Construct the field name for this question's image
        if (filesMap[imgKey]) {
          obj.imagePath = filesMap[imgKey]; // Add the image path if it exists
        }
        return obj;
      });

      // Create new Quiz instance
      const quiz = new Quiz({
        quizId: nanoid(8), // Generate a short unique ID for the quiz
        user: req.user.id, // User ID from the auth middleware
        title,
        subject,
        grade,
        questions: questionsWithImages,
        // Add coverImage path if it was uploaded
        ...(filesMap.coverImage && { coverImage: filesMap.coverImage })
      });

      // Save the quiz to the database
      await quiz.save();

      res.status(201).json(quiz); // Respond with the created quiz object
    } catch (err) {
      console.error('Error in quiz creation:', err.message);
      // Pass the error to the Express error handling middleware
      next(err);
    }
  }
);


/**
 * @route GET api/quizzes/:quizId
 * @desc Get quiz by quizId
 * @access Public
 */
router.get('/:quizId', async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST api/quizzes/:quizId/attempt
 * @desc Submit an attempt for a quiz
 * @access Private
 */
router.post('/:quizId/attempt', auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const { answers } = req.body;
    let score = 0;
    answers.forEach(a => {
      // Basic check, ideally you'd validate questionIndex and given values more thoroughly
      if (quiz.questions[a.questionIndex] && quiz.questions[a.questionIndex].answer === a.given) {
        score++;
      }
    });

    const attempt = new QuizAttempt({ quiz: quiz._id, user: req.user.id, score, answers });
    await attempt.save();

    // Update quiz stats
    quiz.attemptsCount = (quiz.attemptsCount || 0) + 1;
    await quiz.save();

    // Update user stats
    const user = await User.findById(req.user.id);
    if (user) {
      user.totalScore = (user.totalScore || 0) + score;
      user.attemptsCount = (user.attemptsCount || 0) + 1;
      user.quizScores.push({ quizId: quiz.quizId, score });
      await user.save();
    } else {
      console.warn(`User with ID ${req.user.id} not found after quiz attempt.`);
    }

    res.json({ score });
  } catch (err) {
    console.error('Error in quiz attempt submission:', err.message);
    next(err);
  }
});

module.exports = router;