// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  grade:        { type: Number, required: true },
  avatar:       { type: String, default: '' }, // <-- store filename only
  skills: {
    strengths:  { type: [String], default: [] },
    weaknesses: { type: [String], default: [] }
  },
  quizScores:   [{ quizId: String, score: Number }],
  totalScore:   { type: Number, default: 0 },
  attemptsCount:{ type: Number, default: 0 }
});

// Hash password on save
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
UserSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
