// server/models/Lesson.js
const mongoose = require('mongoose');
const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  content: String,
  video: { type: String, default: null },    // เพิ่มฟิลด์ video
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Lesson', lessonSchema);