const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  msg:      { type: String, required: true },
  media:    { type: String },
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  post:     { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  createdAt:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
