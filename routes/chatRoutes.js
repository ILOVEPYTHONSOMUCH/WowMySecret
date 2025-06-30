const express = require('express');
const multer = require('../utils/multerConfig');
const { customAlphabet } = require('nanoid');
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

const router = express.Router();

/**
 * POST /api/chat/send
 * ส่งข้อความระหว่างผู้ใช้
 * Fields: to (userId), message (string), image/video (file optional)
 */
router.post('/send', auth, multer.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ message: 'to และ message ต้องระบุ' });

    const chat = new Chat({
      chatId: nanoid(),
      from: req.user._id,
      to,
      message,
      media: {
        image: req.files.image?.[0]?.filename ? `/uploads/posts/${req.files.image[0].filename}` : null,
        video: req.files.video?.[0]?.filename ? `/uploads/videos/${req.files.video[0].filename}` : null
      }
    });
    await chat.save();
    res.status(201).json(chat);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/chat/conversations/:userId
 * ดึง chat ระหว่างผู้ใช้ตอนนี้และ userId
 */
router.get('/conversations/:userId', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({
      $or: [
        { from: req.user._id, to: userId },
        { from: userId, to: req.user._id }
      ]
    }).sort('createdAt');

    const lastMessage = chats.length ? chats[chats.length - 1].message : null;
    res.json({ chats, lastMessage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
