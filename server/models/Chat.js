const mongoose = require('mongoose');
const ChatSchema = new mongoose.Schema({
  chatId: { type: String, unique: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    media: String,
    createdAt: { type: Date, default: Date.now }
  }]
});
module.exports = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);