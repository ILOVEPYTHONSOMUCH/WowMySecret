const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// Register
router.post('/register', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const { username, email, password, grade, strengths, weaknesses } = req.body;
    const avatarPath = req.file ? req.file.path : undefined;
    const user = new User({
      username, email, password, grade,
      avatar: avatarPath,
      skills: {
        strengths: strengths ? strengths.split(',') : [],
        weaknesses: weaknesses ? weaknesses.split(',') : []
      }
    });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(400).json({ message: 'Registration failed', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be username or email
    const user = await User.findOne({ $or: [ { username: identifier }, { email: identifier } ] });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(400).json({ message: 'Login failed', error: err.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  const user = req.user;
  const totalScore = user.totalScore;
  const attemptsCount = user.attemptsCount;
  res.json({
    username: user.username,
    email: user.email,
    grade: user.grade,
    avatar: user.avatar,
    skills: user.skills,
    totalScore,
    quizScores: user.quizScores,
    attemptsCount
  });
});

// Update profile
router.put('/profile', auth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const user = req.user;
    const { username, password, grade, strengths, weaknesses } = req.body;
    if (username) user.username = username;
    if (password) user.password = password;
    if (grade) user.grade = grade;
    if (strengths) user.skills.strengths = strengths.split(',');
    if (weaknesses) user.skills.weaknesses = weaknesses.split(',');
    if (req.file) user.avatar = req.file.path;
    await user.save();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
});

module.exports = router;
