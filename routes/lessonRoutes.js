// server/routes/lessonRoutes.js
const express = require('express');
const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const upload = require('../utils/multerConfig');

const router = express.Router();

/**
 * POST /api/lessons
 * สร้างบทเรียนใหม่ พร้อมอัปโหลดวิดีโอ (optional)
 * - title (text, required)
 * - description (text)
 * - content (text)
 * - video (file)
 */
router.post('/', auth, upload.single('video'), async (req, res, next) => {
  try {
    const { title, description, content } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'กรุณาระบุ title' });
    }
    let videoUrl = null;
    if (req.file) {
      videoUrl = `/uploads/lessons/${req.file.filename}`;
    }
    const lesson = new Lesson({
      title,
      description,
      content,
      video: videoUrl,
      createdBy: req.user._id
    });
    await lesson.save();
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/lessons/search?q=keyword
 * ค้นหาบทเรียนจาก title หรือ description
 */
router.get('/search', auth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'กรุณาระบุ q ใน query' });
    const lessons = await Lesson.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }).select('title description video createdAt');
    res.json(lessons);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/lessons/:id
 * ดึงรายละเอียดบทเรียน
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('createdBy','name');
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
