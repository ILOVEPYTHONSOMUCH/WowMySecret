// utils/multerConfig.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ตัวอย่าง: แยกโฟลเดอร์ตาม fieldname
    let folder = 'uploads/others';
    if (file.fieldname === 'avatar') folder = 'uploads/profile';
    else if (file.fieldname === 'quizImage') folder = 'uploads/quizzes';
    else if (file.fieldname.startsWith('questionImage_')) folder = 'uploads/quizzes/questions';
    else if (file.fieldname === 'video') folder = 'uploads/videos';
    else if (file.fieldname === 'image') folder = 'uploads/posts';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // อนุญาตเฉพาะรูปภาพและวิดีโอ
  const imageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const videoTypes = ['video/mp4', 'video/quicktime'];
  if (imageTypes.includes(file.mimetype) || videoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ประเภทไฟล์ไม่ถูกต้อง'), false);
  }
};

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter
});
