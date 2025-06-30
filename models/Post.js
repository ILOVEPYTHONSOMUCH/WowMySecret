// server/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title:            { type: String, required: true },    // หัวข้อโพสต์
  description:      { type: String, required: true },    // คำอธิบาย
  teachSubjects:    [{ type: String }],                  // วิชาที่ต้องการสอน
  learnSubjects:    [{ type: String }],                  // วิชาที่ต้องการเรียน
  media: {                                                 
    image:   { type: String, default: null },             // URL รูปภาพในโพสต์
    video:   { type: String, default: null }              // URL วิดีโอในโพสต์
  },
  owner:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
