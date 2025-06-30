const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  choices:  { type: [String], required: true }, // expect 5 choices
  answer:   { type: Number, required: true },    // index of correct choice (0-4)
  image:    { type: String },
  subject:  { type: String }
});

const quizSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  coverImage:  { type: String },
  questions:   [questionSchema],
  totalScore:  { type: Number, default: 0 },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attemptsCount:{ type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});

// Pre-calculate totalScore as number of questions or sum of something
quizSchema.pre('save', function(next) {
  this.totalScore = this.questions.length;
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);
