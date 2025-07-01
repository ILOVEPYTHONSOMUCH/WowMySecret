// utils/multerConfig.js
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// สร้างโฟลเดอร์ถ้ายังไม่มี
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/others';
    if (file.fieldname === 'avatar') folder = 'uploads/profile';
    else if (file.fieldname === 'quizImage') folder = 'uploads/quizzes';
    else if (file.fieldname.startsWith('questionImage_')) folder = 'uploads/quizzes/questions';
    else if (file.fieldname === 'video') folder = 'uploads/videos';
    else if (file.fieldname === 'image') folder = 'uploads/posts';
    // โฟลเดอร์ default สำหรับ fields ใหม่ๆ
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});

const fileFilter = (req, file, cb) => {
  // อนุญาตเฉพาะ image/video
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    // ปฏิเสธไฟล์ที่ไม่ใช่ภาพหรือวิดีโอ
    cb(null, false);
  }
};

module.exports = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter
}).any();  // <<< รับได้ทุก fieldname
