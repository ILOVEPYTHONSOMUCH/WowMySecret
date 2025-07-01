// server/models/Quiz.js
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true },
  imagePath: { type: String }           // ← store full upload path here
});

const QuizSchema = new mongoose.Schema({
  quizId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  questions: { type: [QuestionSchema], default: [] },
  coverImage: { type: String },
  attemptsCount: { type: Number, default: 0 }
});

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
