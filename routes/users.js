const express = require('express');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Update profile
router.put('/', auth, async (req, res) => {
  try {
    const { name, password } = req.body;
    if (name) req.user.name = name;
    if (password) req.user.password = await bcrypt.hash(password, 10);
    await req.user.save();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;