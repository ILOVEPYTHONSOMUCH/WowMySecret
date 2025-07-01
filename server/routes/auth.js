const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('../config/multerConfig');
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Register
router.post('/register', multer.single('avatar'), async (req, res, next) => {
  try {
    const { username, email, password, grade, skills } = req.body;
    const user = new User({ username, email, password, grade });
    if (skills) user.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
    if (req.file) user.avatar = req.file.path;
    await user.save();
    const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) { next(err); }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !(await user.matchPassword(password))) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) { next(err); }
});

// Profile
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) { next(err); }
});

// Update profile (username, password, avatar, grade, skills)
router.put('/profile', auth, multer.single('avatar'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { username, password, grade, skills } = req.body;
    if (username) user.username = username;
    if (grade) user.grade = grade;
    if (skills) user.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (req.file) user.avatar = req.file.path;

    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) { next(err); }
});

module.exports = router;
