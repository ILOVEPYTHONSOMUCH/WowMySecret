const mongoose = require('mongoose');

const watchSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetType:{ type: String, enum: ['Lesson','Post'], required: true },
  target:    { type: mongoose.Schema.Types.ObjectId, required: true },
  liked:     { type: Boolean, default: false },
  disliked:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Watch', watchSchema);
