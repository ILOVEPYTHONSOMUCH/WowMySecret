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
  createdAt:      { type: Date, default: Date.now },
  // --- New fields added below ---
  likes:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of User IDs who liked the post
  dislikes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of User IDs who disliked the post
  viewsCount:     { type: Number, default: 0 },                          // Total number of times the post has been viewed
  commentsCount:  { type: Number, default: 0 }                           // Total number of comments on the post
});

module.exports = mongoose.models.Post || mongoose.model('Post', PostSchema);