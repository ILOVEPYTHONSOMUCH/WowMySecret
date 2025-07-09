// server/config/multerConfig.js
const multer = require('multer');
const path  = require('path');
const fs    = require('fs');

function makeDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const userId = req.user?.id || req.body.userId || 'userprofile';
    // now points to <project‑root>/uploads/<userId>/...
    const base = path.join(__dirname, '..', '..', 'uploads', userId);

    let subfolder;
    if (
      file.fieldname === 'video' ||
      (file.fieldname === 'media' && file.mimetype.startsWith('video'))
    ) {
      subfolder = 'videos';
    } else if (/^questionImage_|^coverImage$/.test(file.fieldname)) {
      subfolder = 'quizzes';
    } else if (file.mimetype.startsWith('video')) {
      subfolder = 'videos';
    } else {
      subfolder = 'images';
    }

    const fullDir = path.join(base, subfolder);
    makeDir(fullDir);
    cb(null, fullDir);
  },

  filename(req, file, cb) {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  }
});

module.exports = multer({ storage });
