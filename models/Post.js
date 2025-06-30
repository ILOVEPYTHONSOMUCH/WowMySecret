const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  content:       { type: String },
  media:         { type: String },            // image/video path
  teachSubjects: [String],
  learnSubjects: [String],
  owner:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
