const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const QuizAttemptSchema = new Schema({
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  score: Number,
  answers: [{ questionIndex: Number, given: String }],
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', QuizAttemptSchema);