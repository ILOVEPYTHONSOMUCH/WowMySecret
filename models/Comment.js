// server/models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  msg:              { type: String, required: true },   // ข้อความคอมเมนต์
  media: {
    image: { type: String, default: null },             // รูปภาพในคอมเมนต์
    video: { type: String, default: null }              // วิดีโอในคอมเมนต์
  },
  owner:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post:             { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
