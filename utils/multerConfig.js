const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder;
    switch (file.fieldname) {
      case 'avatar':           folder = 'uploads/profile'; break;
      case 'image':            folder = 'uploads/posts';   break;
      case 'video':            folder = 'uploads/videos';  break;
      case 'quizImage':        folder = 'uploads/quizzes'; break;
      default:
        if (file.fieldname.startsWith('questionImage_')) {
          folder = 'uploads/quizzes/questions';
        } else {
          return cb(new Error('Unexpected field'), false);
        }
    }
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g,'_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }
};

module.exports = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter
});
