const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text:      { type: String },
  media:     { type: String },
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  participants: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
  messages:     [ messageSchema ],
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
