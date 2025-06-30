const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatId:    { type: String, unique: true, required: true },
  from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:   { type: String, required: true },
  media: {
    image:  { type: String, default: null },
    video:  { type: String, default: null }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);