// server/config/multerConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

function mkdirRecursive(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // SAFELY wait for form fields to be parsed
    let userId = req.body.userId || 'unknown';
    const fileType = file.mimetype.startsWith('video') ? 'videos' : 'images';
    const uploadPath = path.join('uploads', userId, fileType);
    mkdirRecursive(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

module.exports = multer({ storage });
