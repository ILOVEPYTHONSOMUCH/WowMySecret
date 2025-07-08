// config/multerConfig.js
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

    // base upload path (one level above config folder)
    // assumes your project structure is:
    //  project-root/
    //    uploads/
    //    config/
    const base = path.join(__dirname, '..', 'uploads', userId);

    // decide subfolder by fieldname or mimetype
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
