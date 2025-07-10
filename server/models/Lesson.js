// server/models/Lesson.js

const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  lessonId: {
    type: String,
    unique: true,
    required: true // lessonId should ideally be required
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // A lesson should always belong to a user
  },
  title: {
    type: String,
    required: true,
    trim: true // Remove whitespace from both ends
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  relatedQuizzes: {
    type: [String], // Array of strings (quiz IDs or titles)
    default: []
  },
  video: {
    type: String,
    required: true // Path to the main video file
  },
  thumbnailPath: {
    type: String, // Path to the automatically generated video thumbnail image
    default: null // Can be null if thumbnail generation fails
  },
  grade: {
    type: Number,
    required: true,
    min: 1, // Example: Assuming grades start from 1
    max: 12 // Example: Assuming grades go up to 12
  },
  likes:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of User IDs who liked the post
    dislikes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of User IDs who disliked the post
    viewsCount:     { type: Number, default: 0 },                          // Total number of times the post has been viewed
    commentsCount:  { type: Number, default: 0 }   
}, {
  // Mongoose automatically adds `createdAt` and `updatedAt` fields
  timestamps: true
});

// Export the Mongoose model
// Use mongoose.models.Lesson to prevent recompiling the model if it's already defined
module.exports = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);