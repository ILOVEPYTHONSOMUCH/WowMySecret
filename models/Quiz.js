const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text:      { type: String, required: true },         // ข้อความโจทย์
  imageUrl:  { type: String },                         // รูปประกอบ (ถ้ามี)
  options:   { type: [String], required: true, validate: v => v.length === 5 }, // 5 ตัวเลือก
  answerKey: { type: Number, required: true, min: 0, max: 4 } // index ของคำตอบถูก (0–4)
});

const quizSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // เจ้าของ quiz
  questions:    { type: [questionSchema], required: true },
  totalScore:   { type: Number },  // คะแนนเต็ม (เท่ากับจำนวนข้อ)
  takerCount:   { type: Number, default: 0 },  // จำนวนคนที่ทำแล้ว
  createdAt:    { type: Date, default: Date.now }
});

// คำนวณ totalScore แบบอัตโนมัติก่อน save
quizSchema.pre('save', function(next) {
  this.totalScore = this.questions.length;
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);
