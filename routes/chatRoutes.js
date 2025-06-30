const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const auth = require('../middleware/auth');
const { uploadChat } = require('../middleware/upload');

// Send message (create or update chat)
router.post('/', auth, uploadChat.single('media'), async (req, res) => {
  try {
    const { to, text } = req.body;
    const from = req.user._id;
    // Find existing chat between two users
    let chat = await Chat.findOne({ participants: { $all: [from, to] } });
    if (!chat) {
      chat = new Chat({ participants: [from, to], messages: [] });
    }
    const message = {
      from,
      to,
      text,
      media: req.file ? req.file.path : undefined
    };
    chat.messages.push(message);
    await chat.save();
    res.json({ message: 'Message sent' });
  } catch (err) {
    res.status(400).json({ message: 'Message failed', error: err.message });
  }
});

// Get chat list (latest message preview)
router.get('/', auth, async (req, res) => {
  const userId = req.user._id;
  const chats = await Chat.find({ participants: userId }).populate('participants', 'username');
  // Map to preview
  const previews = chats.map(chat => {
    const other = chat.participants.find(p => !p._id.equals(userId));
    const lastMsg = chat.messages[chat.messages.length - 1];
    return {
      chatId: chat._id,
      with: other ? other.username : null,
      lastMessage: lastMsg ? lastMsg.text : '',
      lastMedia: lastMsg ? lastMsg.media : null,
      timestamp: lastMsg ? lastMsg.createdAt : chat.createdAt
    };
  });
  res.json(previews);
});

// Get messages in a chat
router.get('/:chatId', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId).populate('messages.from messages.to', 'username');
  if (!chat) return res.status(404).json({ message: 'Chat not found' });
  res.json(chat.messages);
});

module.exports = router;
