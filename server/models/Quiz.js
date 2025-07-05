const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  answer: String,
  imagePath: String
});

const quizSchema = new mongoose.Schema({
  quizId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true }, // ✅ NEW FIELD
  questions: [questionSchema],
  coverImage: String,
  attemptsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
