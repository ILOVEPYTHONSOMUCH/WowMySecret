const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper: ensure directory exists
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Storage factory
const storageFactory = (folder) => {
  ensureDir(folder);
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random()*1E9);
      cb(null, unique + path.extname(file.originalname));
    }
  });
};

// File filters
const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.png','.jpg','.jpeg','.gif'].includes(ext)) cb(null, true);
  else cb(null, false);
};
const videoFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.mp4','.mov','.wmv','.avi','.mkv'].includes(ext)) cb(null, true);
  else cb(null, false);
};

// Upload instances
const uploadAvatar    = multer({ storage: storageFactory('uploads/avatars'), fileFilter: imageFilter });
const uploadQuizCover = multer({ storage: storageFactory('uploads/quizcovers'), fileFilter: imageFilter });
const uploadPostMedia = multer({ storage: storageFactory('uploads/postmedia') });
const uploadLesson    = multer({ storage: storageFactory('uploads/lessonvideos'), fileFilter: videoFilter });
const uploadComment   = multer({ storage: storageFactory('uploads/commentmedia') });
const uploadChat      = multer({ storage: storageFactory('uploads/chatmedia') });

module.exports = {
  uploadAvatar,
  uploadQuizCover,
  uploadPostMedia,
  uploadLesson,
  uploadComment,
  uploadChat
};
