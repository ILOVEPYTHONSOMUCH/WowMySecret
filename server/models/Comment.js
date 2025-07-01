const mongoose = require('mongoose');
const CommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  msg: String,
  media: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);