// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
require('dotenv').config();

const router = express.Router();

// POST /api/register
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res, next) => {
  // validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;
    // check duplicate email
    if (await User.findOne({ email })) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });

    // hash pwd
    const hash = await bcrypt.hash(password, 12);
    const user = new User({ name, email, password: hash });
    await user.save();
    res.json({ message: 'Registered successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
