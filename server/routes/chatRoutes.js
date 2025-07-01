const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../config/multerConfig');
const { nanoid } = require('nanoid');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Send Message
router.post('/send', auth, multer.single('media'), async (req, res, next) => {
  try {
    const { to, message } = req.body;
    let chat = await Chat.findOne({ participants: { $all: [req.user.id, to] } });
    if (!chat) {
      chat = new Chat({ chatId: nanoid(8), participants: [req.user.id, to], messages: [] });
    }
    chat.messages.push({ sender: req.user.id, text: message, media: req.file?.path });
    await chat.save();
    res.json(chat);
  } catch (err) { next(err); }
});

// List Previews
/*
router.get('/', auth, async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id });
    const previews = chats.map(c => ({
      chatId: c.chatId,
      lastMessage: c.messages[c.messages.length - 1],
      participants: c.participants
    }));
    res.json(previews);
  } catch (err) { next(err); }
});

// Get Conversation
router.get('/conversations/:chatId', auth, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ chatId: req.params.chatId });
    res.json(chat);
  } catch (err) { next(err); }
});
*/
module.exports = router;