const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/others';
    if (file.fieldname === 'avatar') folder = 'uploads/profile';
    else if (file.fieldname === 'quizImage') folder = 'uploads/quizzes';
    else if (file.fieldname.startsWith('questionImage_')) folder = 'uploads/quizzes/questions';
    else if (file.fieldname === 'video') folder = 'uploads/videos';
    else if (file.fieldname === 'image') folder = 'uploads/posts';

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('ประเภทไฟล์ไม่ถูกต้อง'), false);
  }
};

module.exports = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter
});