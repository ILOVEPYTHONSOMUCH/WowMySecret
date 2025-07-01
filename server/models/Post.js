const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  description: String,
  teachSubjects: [String],
  learnSubjects: [String],
  image: String,
  video: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.models.Post || mongoose.model('Post', PostSchema);