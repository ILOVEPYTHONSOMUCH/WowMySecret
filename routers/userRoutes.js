const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const auth = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.put('/', auth, upload.single('avatar'), async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      password: req.body.password,
      skills: req.body.skills ? JSON.parse(req.body.skills) : undefined,
    };
    if (req.file) updateData.avatar = `/uploads/profile/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      skills: req.body.skills ? JSON.parse(req.body.skills) : undefined,
      avatar: req.file ? `/uploads/profile/${req.file.filename}` : null
    });
    await user.save();
    res.json({ message: 'Registered successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;