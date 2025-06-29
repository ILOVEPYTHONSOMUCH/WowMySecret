const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../utils/multerConfig').fields([
  { name: 'quizImage',       maxCount: 1 },
  { name: 'questionImage_0', maxCount: 1 },
  { name: 'questionImage_1', maxCount: 1 },
  // เพิ่มตามดัชนีคำถามสูงสุดที่ระบบรองรับ
]);
const quizCtrl = require('../controllers/quizController');

// สร้าง Quiz พร้อมรูปแต่ละข้อ
router.post('/', auth, upload, quizCtrl.createQuiz);

// รายการ Quiz (ไม่รวมเฉลย)
router.get('/', auth, quizCtrl.listQuizzes);

// ดูรายละเอียด Quiz (ไม่มีเฉลย)
router.get('/:id', auth, quizCtrl.getQuizDetail);

// ตอบ Quiz
router.post('/:id/answer', auth, quizCtrl.answerQuiz);

// เฉลย Quiz สำหรับเจ้าของ
router.get('/:id/answers', auth, quizCtrl.getQuizAnswers);

module.exports = router;
