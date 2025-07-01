const mongoose = require('mongoose');
const QuizSchema = new mongoose.Schema({
  quizId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  subject: String,
  questions: [{ question: String, options: [String], answer: String, imageIndex: Number }],
  coverImage: String,
  attemptsCount: { type: Number, default: 0 }
});
module.exports = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);