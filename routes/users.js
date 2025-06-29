// server/routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const upload = require('../utils/multerConfig'); // config ที่รองรับ fieldname 'avatar'
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// PUT /api/users  —  อัปเดตโปรไฟล์ + รูปโปรไฟล์ + skills
router.put('/', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    const { name, password, skills } = req.body;
    const update = {};
    if (name) update.name = name;
    if (password) update.password = await bcrypt.hash(password, 12);
    if (skills) update.skills = JSON.parse(skills);
    if (req.file) {
      update.avatar = `/uploads/profile/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
