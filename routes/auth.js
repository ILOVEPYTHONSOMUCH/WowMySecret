// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('../utils/multerConfig');
const User = require('../models/User');
require('dotenv').config();

/**
 * POST /api/register
 * สมัครสมาชิก ด้วย username และ email
 * Fields:
 * - username (string, required)
 * - email    (string, required)
 * - password (string, required)
 * - grade    (string, required)
 * - avatar   (file, optional)
 * - quizIds  (stringified JSON array of quiz IDs, optional)
 */
router.post('/register', multer.single('avatar'), async (req, res) => {
  try {
    const { username, email, password, grade, quizIds } = req.body;
    if (!username || !email || !password || !grade) {
      return res.status(400).json({ message: 'กรุณาระบุ username, email, password และ grade' });
    }
    // ตรวจรูปแบบ email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }
    // ตรวจสอบซ้ำ username และ email
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'Username นี้มีอยู่แล้ว' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);
    const avatarUrl = req.file ? `/uploads/profile/${req.file.filename}` : null;

    // prepare quizScores
    let quizScores = [];
    if (quizIds) {
      const ids = JSON.parse(quizIds);
      if (Array.isArray(ids)) quizScores = ids.map(id => ({ quizId: id, score: 0 }));
    }

    // create user
    const user = new User({ username, email, password: hashed, grade, avatar: avatarUrl, quizScores });
    await user.save();

    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

/**
 * POST /api/login
 * เข้าสู่ระบบด้วย username หรือ email และ password
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be username or email
    if (!identifier || !password) {
      return res.status(400).json({ message: 'กรุณาระบุ username/email และ password' });
    }
    // find by username or email
    const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
    if (!user) return res.status(401).json({ message: 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        grade: user.grade,
        avatar: user.avatar,
        quizScores: user.quizScores
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

module.exports = router;
