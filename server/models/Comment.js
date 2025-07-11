const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  // This field will store the ObjectId of either a Lesson or a Post
  content: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // The 'refPath' property tells Mongoose which model to use for population.
    // It will look at the value of the 'onModel' field in the same document.
    refPath: 'onModel'
  },
  // This field determines which model 'content' refers to.
  // It will hold the string name of the model ('Lesson' or 'Post').
  onModel: {
    type: String,
    required: true,
    enum: ['Lesson', 'Post'] // Restrict possible values to 'Lesson' or 'Post'
  },
  // The user who posted the comment
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a 'User' model
    required: true
  },
  // The text content of the comment (renamed from 'msg')
  text: {
    type: String,
    trim: true, // Removes whitespace from both ends of a string
    maxlength: 500 // Optional: Set a maximum length for comments
    // You might want to make this optional if comments can be purely media-based,
    // but typically comments have text. If it's optional, ensure at least
    // 'text' OR 'imagePath' OR 'videoPath' is present in your backend validation.
  },
  // Path to the uploaded image file for the comment
  imagePath: {
    type: String
  },
  // Path to the uploaded video file for the comment
  videoPath: {
    type: String
  }
}, {
  // timestamps: true automatically adds createdAt and updatedAt fields
  // This is very useful for sorting comments by creation date.
  timestamps: true
});

// Export the model. If the model already exists, use it; otherwise, create it.
module.exports = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);