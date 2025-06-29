// server/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title:      { type: String, required: true },    // NEW
  author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:    { type: String, required: true },
  image:      { type: String, default: null },
  video:      { type: String, default: null },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
