const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  video:       { type: String, required: true }, // video path
  subject:     { type: String, required: true },
  description: { type: String },
  quiz:        { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  viewsCount:  { type: Number, default: 0 },
  likesCount:  { type: Number, default: 0 },
  dislikesCount:{ type: Number, default: 0 },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', lessonSchema);
