const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  grade:    { type: String },
  avatar:   { type: String },
  skills: {
    strengths: [String],
    weaknesses: [String]
  },
  quizScores: [
    {
      quiz:  { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
      score: Number
    }
  ],
  totalScore:    { type: Number, default: 0 },
  attemptsCount: { type: Number, default: 0 }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(plain) {
  return await bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
