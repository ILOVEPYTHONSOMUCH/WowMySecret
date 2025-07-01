const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  grade: String,
  avatar: String,
  skills: { strengths: [String], weaknesses: [String] },
  quizScores: [{ quizId: String, score: Number }],
  totalScore: { type: Number, default: 0 },
  attemptsCount: { type: Number, default: 0 }
});
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
UserSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password);
};
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);