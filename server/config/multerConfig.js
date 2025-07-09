// server/config/multerConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Determine the user ID for the upload directory.
    // Prioritize req.user.id (from auth middleware) if available,
    // otherwise fallback to req.body.userId (if passed in a form field for unauthenticated uploads, less secure),
    // or a generic 'temp' folder if no user ID can be determined.
    const userId = req.user?.id || req.body.userId || 'temp'; // Changed to 'temp' from 'userprofile' for clarity

    // Base upload directory: <project-root>/uploads/<userId>/
    // IMPORTANT: __dirname is the directory of multerConfig.js (e.g., server/config)
    // So '..', '..' brings us up two levels to the project root.
    const baseUploadDir = path.join(__dirname, '..', '..', 'uploads', userId);

    let subfolder;
    if (file.mimetype.startsWith('video/')) { // More robust check for video mime types
      subfolder = 'videos';
    } else if (file.mimetype.startsWith('image/')) { // More robust check for image mime types
      // Specific subfolders for quizzes or general images
      if (/^questionImage_|^coverImage$/.test(file.fieldname)) {
        subfolder = 'quizzes';
      } else {
        subfolder = 'images';
      }
    } else {
      subfolder = 'others'; // For any other file types
    }

    const fullUploadPath = path.join(baseUploadDir, subfolder);

    makeDir(fullUploadPath); // Ensure the directory exists
    cb(null, fullUploadPath);
  },

  filename(req, file, cb) {
    // Generate a unique filename using timestamp and original name to avoid collisions
    // and preserve the original extension.
    const fileExtension = path.extname(file.originalname);
    const fileName = path.basename(file.originalname, fileExtension); // Get name without extension
    const uniqueSuffix = Date.now();
    // Example: myImage-1700000000.jpg
    cb(null, `${fileName}-${uniqueSuffix}${fileExtension}`);
  }
});

module.exports = multer({ storage });