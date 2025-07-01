const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('../config/multerConfig');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Register
router.post('/register', multer.single('avatar'), async (req, res, next) => {
  try {
    const { username, email, password, grade } = req.body;
    const user = new User({ username, email, password, grade });
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

router.put('/profile', auth, multer.single('avatar'), async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (req.file) update.avatar = req.file.path;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;