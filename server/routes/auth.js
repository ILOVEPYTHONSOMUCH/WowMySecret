const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('../config/multerConfig');
const auth = require('../middleware/auth');
const User = require('../models/User');

// ─── Register ─────────────────────────────────────────────────────────
router.post('/register', multer.single('avatar'), async (req, res, next) => {
  try {
    const { username, email, password, grade } = req.body;
    // 1) Create the user document
    const user = new User({ username, email, password, grade });
    await user.save();

    // 2) If an avatar was uploaded, multerConfig already placed it under /uploads/<userId>/images
    if (req.file) {
      // req.file.path contains absolute path; convert to relative URL path
      const relativePath = req.file.path.split(path.sep).slice(-3).join('/');
      user.avatar = relativePath; // e.g. 'uploads/<userId>/images/filename.jpg'
      await user.save();
    }

    // 3) Issue JWT with payload.id = user._id
    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// ─── Login ────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// ─── Get Profile ──────────────────────────────────────────────────────
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ─── Update Profile ───────────────────────────────────────────────────
router.put('/profile', auth, multer.single('avatar'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { username, password, grade: gradeRaw, skills , note} = req.body;

    // Update basic fields
    if (username) user.username = username;
    if (gradeRaw !== undefined) {
      const g = parseInt(gradeRaw, 10);
      if (!isNaN(g)) user.grade = g;
    }
    if (note){
      user.note = note;
    }
    // Update skills
    if (skills) {
      user.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
    }

    // Update password
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Update avatar
    if (req.file) {
      const relativePath = req.file.path.split(path.sep).slice(-3).join('/');
      user.avatar = relativePath;
    }

    await user.save();

    const updated = await User.findById(req.user.id).select('-password').lean();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;