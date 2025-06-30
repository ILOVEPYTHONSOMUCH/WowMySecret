const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  lessonId:      { type: String, unique: true, required: true },
  title:         { type: String, required: true },
  videoPath:     { type: String, required: true },
  subject:       { type: String, required: true },
  description:   { type: String, required: true },
  relatedQuizzes:[String],
  owner:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewsCount:    { type: Number, default: 0 },
  likesCount:    { type: Number, default: 0 },
  dislikesCount: { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', lessonSchema);

// server/routes/lessonRoutes.js
const express = require('express');
const multer = require('../utils/multerConfig');
const Lesson = require('../models/Lesson');
const auth = require('../middleware/auth');
const { customAlphabet } = require('nanoid');
const nanoidL = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

const lr = express.Router();

// Create lesson
lr.post('/', auth, multer.single('video'), async (req, res, next) => {
  try {
    const { title, subject, description, relatedQuizzes } = req.body;
    if (!title || !subject || !description) return res.status(400).json({ message: 'Missing fields' });
    const lesson = new Lesson({
      lessonId: nanoidL(),
      title,
      videoPath: `/uploads/videos/${req.file.filename}`,
      subject,
      description,
      relatedQuizzes: relatedQuizzes ? JSON.parse(relatedQuizzes) : [],
      owner: req.user._id
    });
    await lesson.save();
    res.status(201).json(lesson);
  } catch(err) {
    next(err);
  }
});

// Get lessons
lr.get('/', auth, async (req, res, next) => {
  try {
    const lessons = await Lesson.find().populate('owner','username');
    res.json(lessons);
  } catch(err) {
    next(err);
  }
});

module.exports = { quizRoutes: router, lessonRoutes: lr };