const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  avatar: { type: String, default: null },
  skills: {
    strengths: [String],
    weaknesses: [String],
  },
  totalScore: {           // เพิ่มฟิลด์เก็บคะแนนสะสม
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('User', userSchema);