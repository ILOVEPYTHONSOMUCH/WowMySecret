// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const UserSchema = new mongoose.Schema({
  // new: short random ID for folder names
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(8)
  },

  username:      { type: String, required: true, unique: true },
  email:         { type: String, required: true, unique: true },
  password:      { type: String, required: true },
  grade:         { type: Number, required: true },
  avatar:        { type: String, default: '' },  // just the relative path or filename
  skills: {
    strengths:   { type: [String], default: [] },
    weaknesses:  { type: [String], default: [] }
  },
  quizScores:    [{ quizId: String, score: Number }],
  totalScore:    { type: Number, default: 0 },
  attemptsCount: { type: Number, default: 0 },
  note: {type: String, default : "nothing"}
}, 
{
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password to stored hash
UserSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
