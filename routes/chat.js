const express = require('express');
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');

module.exports = (io) => {
  const router = express.Router();

  // REST send message
  router.post('/', auth, async (req, res) => {
    const chat = new Chat({ from: req.user._id, to: req.body.to, message: req.body.message });
    await chat.save();
    io.to(req.body.to).emit('message', chat);
    res.json(chat);
  });

  // REST get conversation
  router.get('/:userId', auth, async (req, res) => {
    const chats = await Chat.find({ $or: [
      { from: req.user._id, to: req.params.userId },
      { from: req.params.userId, to: req.user._id }
    ]}).sort('createdAt');
    res.json(chats);
  });

  // Socket join
  io.on('connection', (socket) => {
    socket.on('join', ({ userId }) => {
      socket.join(userId);
    });
    socket.on('disconnect', () => {});
  });

  return router;
};