const mongoose = require('mongoose');
const LessonSchema = new mongoose.Schema({
  lessonId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  subject: String,
  description: String,
  relatedQuizzes: [String],
  video: String,
  grade: { type: Number, required: true }, // ✅ Add this line
  viewsCount: { type: Number, default: 0 },
  likesCount: { type: Number, default: 0 },
  dislikesCount: { type: Number, default: 0 }
});
module.exports = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);