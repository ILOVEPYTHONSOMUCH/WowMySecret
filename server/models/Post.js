// models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  grade:          { type: Number, required: true },
  title:          { type: String, default: '' },
  description:    { type: String, default: '' },
  teachSubjects:  { type: [String], default: [] },
  learnSubjects:  { type: [String], default: [] },
  image:          { type: String, default: '' },
  video:          { type: String, default: '' },
  createdAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.models.Post || mongoose.model('Post', PostSchema);
