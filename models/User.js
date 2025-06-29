const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  avatar: String,
  skills: {
    strengths: [String],
    weaknesses: [String],
  }
});

module.exports = mongoose.model('User', userSchema);