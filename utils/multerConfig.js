// utils/multerConfig.js
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/others';
    if (file.fieldname === 'video') {
      if (req.baseUrl && req.baseUrl.includes('/lessons')) {
        folder = 'uploads/lessons';
      } else {
        folder = 'uploads/videos';
      }
    }
    switch (file.fieldname) {
      case 'avatar':       folder = 'uploads/profile'; break;
      case 'quizImage':    folder = 'uploads/quizzes'; break;
      case 'image':        folder = 'uploads/posts'; break;
    }
    if (file.fieldname.startsWith('questionImage_')) {
      folder = 'uploads/quizzes/questions';
    }
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const ALLOWED_MIME = new Set([
  'image/png','image/jpg','image/jpeg','image/gif',
  'video/mp4','video/mpeg','video/quicktime','video/webm'
]);

const fileFilter = (req, file, cb) => {
  console.log('[Multer] field:', file.fieldname, 'mimetype:', file.mimetype);
  if (ALLOWED_MIME.has(file.mimetype)) {
    return cb(null, true);
  }
  // สำรองด้วย extension ถ้า browser ส่ง mimetype ผิด
  const ext = path.extname(file.originalname).toLowerCase();
  const extMap = {
    '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
    '.gif':'image/gif','.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm'
  };
  if (extMap[ext]) {
    console.warn(`[Multer] Warning: treat ${file.originalname} as ${extMap[ext]}`);
    return cb(null, true);
  }
  const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
  err.message = `ประเภทไฟล์ไม่ถูกต้อง: ${file.originalname}`;
  cb(err, false);
};

module.exports = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter
});
