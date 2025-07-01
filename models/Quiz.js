const mongoose = require('mongoose');

// คำถามแต่ละข้อ
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options:  { type: [String], required: true },   // ต้องมี 5 ตัวเลือก
  answer:   { type: String, required: true },     // ค่าเฉลย
  image:    { type: String, default: null }       // รูปภาพประกอบข้อ
});

// สคีมา Quiz หลัก
const quizSchema = new mongoose.Schema({
  quizId:       { type: String, unique: true, required: true },  // รหัสสุ่ม 8 ตัว
  title:        { type: String, required: true },
  coverImage:   { type: String, default: null },                // ภาพหน้าปก
  questions:    { type: [questionSchema], required: true },
  subject:      { type: String, required: true },
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attemptsCount:{ type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now }
});

// ป้องกันการประกาศโมเดลซ้ำ
module.exports = mongoose.models.Quiz 
  || mongoose.model('Quiz', quizSchema);
