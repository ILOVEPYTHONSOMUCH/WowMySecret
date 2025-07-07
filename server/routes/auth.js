// server/routes/auth.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('../config/multerConfig');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { nanoid } = require('nanoid');
const mkdirRecursive = require('../utils/mkdirRecursive');

// ─── Register ─────────────────────────────────────────────────────────
router.post('/register', multer.single('avatar'), async (req, res, next) => {
  try {
    const { username, email, password, grade } = req.body;
    const userId = nanoid(8);

    // 1) Create the user document
    const user = new User({ userId, username, email, password, grade });
    await user.save();

    // 2) If an avatar was uploaded, move it into uploads/<userId>/images
    if (req.file) {
      const destDir = path.join('uploads', user.userId, 'images');
      await mkdirRecursive(destDir);

      const destPath = path.join(destDir, req.file.filename);
      fs.renameSync(req.file.path, destPath);

      user.avatar = `${destDir}/${req.file.filename}`.replace(/\\/g, '/');
      await user.save();
    }

    // 3) Issue JWT
    const token = jwt.sign(
      { user: { id: user._id } },
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
    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { user: { id: user._id } },
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
router.put(
  '/profile',
  auth,
  multer.single('avatar'),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const {
        username,
        password,
        grade: gradeRaw,
        strengths,
        weaknesses,
        skills
      } = req.body;

      // Update basic fields
      if (username) user.username = username;
      if (gradeRaw !== undefined) {
        const g = parseInt(gradeRaw, 10);
        if (!isNaN(g)) user.grade = g;
      }

      // Update skills
      if (skills) {
        user.skills = typeof skills === 'string'
          ? JSON.parse(skills)
          : skills;
      } else {
        user.skills = {
          strengths: strengths ? [strengths] : [],
          weaknesses: weaknesses ? [weaknesses] : []
        };
      }

      // Update password
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      // Update avatar file if provided
      if (req.file) {
        const destDir = path.join('uploads', user.userId, 'images');
        await mkdirRecursive(destDir);

        const destPath = path.join(destDir, req.file.filename);
        fs.renameSync(req.file.path, destPath);

        user.avatar = `${destDir}/${req.file.filename}`.replace(/\\/g, '/');
      }

      await user.save();

      // Return updated user
      const updated = await User.findById(req.user.id)
        .select('-password')
        .lean();
      res.json(updated);

    } catch (err) {
      console.error('Update error:', err);
      res.status(500).json({ message: 'Server error while updating profile' });
    }
  }
);

module.exports = router;
