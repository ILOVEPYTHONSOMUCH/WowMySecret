// routes/auth.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('../config/multerConfig');
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Register
router.post(
  '/register',
  multer.single('avatar'),
  async (req, res, next) => {
    try {
      const { username, email, password, grade: gradeRaw, skills } = req.body;
      const grade = parseInt(gradeRaw, 10);
      if (isNaN(grade)) {
        return res.status(400).json({ message: 'Invalid grade' });
      }

      // Create user
      const user = new User({
        username,
        email,
        password,
        grade
      });

      // Parse skills if present
      if (skills) {
        user.skills = typeof skills === 'string'
          ? JSON.parse(skills)
          : skills;
      }

      // If multer stored a file, save the full path
      if (req.file && req.file.path) {
        // e.g. 'uploads/6863f7d4d83504e964c55ef2/images/avatar.jpg'
        user.avatar = req.file.path;
      }

      await user.save();

      // Sign JWT
      const token = jwt.sign(
        { user: { id: user._id } },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ token });
    } catch (err) {
      next(err);
    }
  }
);

// Login
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

// Get current user
router.get('/me', auth, async (req, res, next) => {
  try {
    // Include avatar path so client can load via /api/file?path=<avatar>
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Update profile
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
        skills // optional if full object is sent as JSON
      } = req.body;

      if (username) user.username = username;

      if (gradeRaw !== undefined) {
        const g = parseInt(gradeRaw, 10);
        if (!isNaN(g)) user.grade = g;
      }

      // Handle skills in two possible ways
      if (skills) {
        user.skills = typeof skills === 'string'
          ? JSON.parse(skills)
          : skills;
      } else {
        // Legacy or manual field-based input
        user.skills = {
          strengths: strengths ? [strengths] : [],
          weaknesses: weaknesses ? [weaknesses] : []
        };
      }

      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      if (req.file && req.file.path) {
        user.avatar = req.file.path; // already has userId-based path from multer
      }

      await user.save();

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
