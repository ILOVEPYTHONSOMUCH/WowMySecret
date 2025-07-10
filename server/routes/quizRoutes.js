// routes/quizRoute.js
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
 * - Requires: title, subject, grade, level, questions (stringified JSON array)
 * - Optional files: coverImage, questionImage_<index>
 */
router.post(
  '/',
  auth, // Protects the route, adds req.user.id
  multer.any(), // Handles multipart/form-data, including files and text fields
  async (req, res, next) => {
    try {
      // Destructure 'level' from req.body
      const { title, subject, grade, level, questions } = req.body;

      // Basic validation for required text fields, including 'level'
      if (!title || !subject || !grade || !level || !questions) {
        return res.status(400).json({ message: 'Title, subject, grade, level, and questions are required.' });
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

      // Create new Quiz instance, including 'level'
      const quiz = new Quiz({
        quizId: nanoid(8), // Generate a short unique ID for the quiz
        user: req.user.id, // User ID from the auth middleware
        title,
        subject,
        grade,
        level, // ✅ Include the new level field
        questions: questionsWithImages,
        // Add coverImage path if it was uploaded
        ...(filesMap.coverImage && { coverImage: filesMap.coverImage }),
        // Initialize new fields
        likes: [],
        dislikes: [],
        viewsCount: 0,
        commentsCount: 0,
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
 * @remarks Increments viewsCount
 */
router.get('/:quizId', async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Increment viewsCount
    quiz.viewsCount = (quiz.viewsCount || 0) + 1;
    await quiz.save(); // Save the updated viewsCount

    res.json(quiz);
  } catch (err) {
    console.error('Error getting quiz by ID:', err.message);
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

// --- NEW Endpoints for Like/Dislike System for Quizzes ---

/**
 * @route POST /api/quizzes/:id/like
 * @desc Like or Unlike a quiz
 * @access Private
 */
router.post('/:id/like', auth, async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id; // User ID from authenticated token

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const isLiked = quiz.likes.includes(userId);
    const isDisliked = quiz.dislikes.includes(userId);

    if (isLiked) {
      // If already liked, unlike it (remove user ID from likes array)
      quiz.likes = quiz.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // If not liked, add user ID to likes array
      quiz.likes.push(userId);
      // If user had previously disliked, remove their ID from dislikes array
      if (isDisliked) {
        quiz.dislikes = quiz.dislikes.filter(id => id.toString() !== userId.toString());
      }
    }

    await quiz.save();
    res.status(200).json({
      message: isLiked ? 'Quiz unliked successfully.' : 'Quiz liked successfully.',
      likesCount: quiz.likes.length,
      dislikesCount: quiz.dislikes.length,
      isLikedByUser: quiz.likes.includes(userId),
      isDislikedByUser: quiz.dislikes.includes(userId)
    });

  } catch (err) {
    console.error('Error liking quiz:', err);
    next(err);
  }
});

/**
 * @route POST /api/quizzes/:id/dislike
 * @desc Dislike or Undislike a quiz
 * @access Private
 */
router.post('/:id/dislike', auth, async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id; // User ID from authenticated token

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const isDisliked = quiz.dislikes.includes(userId);
    const isLiked = quiz.likes.includes(userId);

    if (isDisliked) {
      // If already disliked, undislike it (remove user ID from dislikes array)
      quiz.dislikes = quiz.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      // If not disliked, add user ID to dislikes array
      quiz.dislikes.push(userId);
      // If user had previously liked, remove their ID from likes array
      if (isLiked) {
        quiz.likes = quiz.likes.filter(id => id.toString() !== userId.toString());
      }
    }

    await quiz.save();
    res.status(200).json({
      message: isDisliked ? 'Quiz undisliked successfully.' : 'Quiz disliked successfully.',
      likesCount: quiz.likes.length,
      dislikesCount: quiz.dislikes.length,
      isLikedByUser: quiz.likes.includes(userId),
      isDislikedByUser: quiz.dislikes.includes(userId)
    });

  } catch (err) {
    console.error('Error disliking quiz:', err);
    next(err);
  }
});


// --- NEW ROUTE: Fetch Quiz Attempts for Authenticated User ---
/**
 * @route GET api/quizzes/attempts/me
 * @desc Get all quiz attempts for the authenticated user, aggregated by subject
 * @access Private
 */
router.get('/attempts/me', auth, async (req, res, next) => {
  try {
      const userId = req.user.id;

      const attempts = await QuizAttempt.find({ user: userId })
          .populate({
              path: 'quiz',
              select: 'title subject questions quizId',
          })
          .sort({ createdAt: -1 }); // Sort by most recent attempts first

      let latestOverallAttemptDate = null;
      const detailedAttempts = [];

      attempts.forEach(attempt => {
          if (attempt.quiz) {
              const quizTitle = attempt.quiz.title;
              const quizId = attempt.quiz.quizId;
              const subject = attempt.quiz.subject;
              const score = attempt.score;
              const totalQuestions = attempt.quiz.questions ? attempt.quiz.questions.length : 0;
              const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

              // Determine simple status based on percentage
              let status = 'Not Rated'; // Default status
              if (percentage >= 90) status = 'Excellent';
              else if (percentage >= 70) status = 'Good';
              else if (percentage >= 50) status = 'Fair';
              else status = 'Needs Practice';

              detailedAttempts.push({
                  _id: attempt._id,
                  quizId,
                  quizTitle,
                  subject,
                  score,
                  totalQuestions,
                  percentage: Math.round(percentage),
                  attemptedAt: attempt.createdAt,
                  status, // Now includes a simple status instead of AI feedback
              });

              if (!latestOverallAttemptDate || attempt.createdAt > latestOverallAttemptDate) {
                  latestOverallAttemptDate = attempt.createdAt;
              }
          }
      });

      const user = await User.findById(userId).select('username profilePicture');

      res.json({
          userProfile: {
              username: user ? user.username : 'Unknown User',
              profilePicture: user ? user.profilePicture : null,
              testTakenDate: latestOverallAttemptDate,
          },
          detailedAttempts,
      });

  } catch (err) {
      console.error('Error fetching user quiz attempts:', err.message);
      next(err);
  }
});

module.exports = router;