const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const type = file.mimetype.startsWith('video') ? 'videos' : 'images';
    const dir = path.join(__dirname, '../../uploads', userId, type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, nanoid(8) + ext);
  }
});
module.exports = multer({ storage });