const mongoose = require('mongoose');

// Validate exactly 5 options
function optionsValidator(val) {
  return Array.isArray(val) && val.length === 5;
}

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [optionsValidator, 'ต้องมีตัวเลือก 5 ข้อ']
  },
  answer: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return this.options.includes(v);
      },
      message: 'คำตอบต้องตรงกับหนึ่งในตัวเลือก'
    }
  },
  image: { type: String, default: null }
});

const quizSchema = new mongoose.Schema({
  quizId:        { type: String, unique: true, required: true },
  title:         { type: String, required: true },
  coverImage:    { type: String, default: null },
  questions:     { type: [questionSchema], required: true },
  questionsCount:{ type: Number, required: true },
  totalScore:    { type: Number, required: true },
  subject:       { type: String, required: true },
  owner:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attemptsCount: { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now }
});

// Pre-save to set questionsCount
quizSchema.pre('save', function(next) {
  this.questionsCount = this.questions.length;
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);
