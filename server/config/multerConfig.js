const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // extract userId from auth or form
    const userId = req.user?.id || req.body.userId || 'userprofile';

    // base upload path inside server
    const base = path.join(__dirname, '..', 'server', 'uploads', userId);

    // decide subfolder by fieldname or mimetype
    let subfolder;
    if (file.fieldname === 'video' || file.fieldname === 'media' && file.mimetype.startsWith('video')) {
      // lesson videos or comment media videos
      subfolder = 'videos';
    } else if (/^questionImage_|^coverImage$/.test(file.fieldname)) {
      // quiz-specific images
      subfolder = 'quizzes';
    } else if (file.mimetype.startsWith('video')) {
      // any other detected video
      subfolder = 'videos';
    } else {
      // all other images: avatars, post images, quiz question images without questionImage_ prefix
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
