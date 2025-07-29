
const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [{
    sender: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: String,
    media: String,
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  lastMessage: {
    text: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Chat', ChatSchema);