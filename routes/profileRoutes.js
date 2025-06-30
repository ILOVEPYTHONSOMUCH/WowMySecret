const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('../utils/multerConfig');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * PUT /api/profile
 * อัปเดตโปรไฟล์ผู้ใช้ตัวเอง
 * Fields: username?, password?, avatar (file), skills (JSON string: { strengths:[], weaknesses:[] })
 */
router.put('/', auth, multer.single('avatar'), async (req, res, next) => {
  try {
    const { username, password, skills } = req.body;
    const update = {};
    if (username) update.username = username;
    if (password) update.password = await bcrypt.hash(password, 10);
    if (skills) update.skills = JSON.parse(skills);
    if (req.file) update.avatar = `/uploads/profile/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('-password');
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;