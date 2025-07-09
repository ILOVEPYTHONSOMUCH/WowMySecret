const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Path to your authentication middleware
const multer = require('../config/multerConfig'); // Path to your Multer configuration
const { nanoid } = require('nanoid');
const Lesson = require('../models/Lesson'); // Path to your Lesson Mongoose model

// New imports required for thumbnail generation
const ffmpeg = require('fluent-ffmpeg'); // For interacting with ffmpeg
const path = require('path');           // For handling file paths
const fs = require('fs');               // For file system operations (e.g., checking/creating directories)
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');    // <--- Change this to your ffmpeg.exe path
ffmpeg.setFfprobePath('C:\\ffmpeg\\bin\\ffprobe.exe'); 
// Optional: Set ffmpeg and ffprobe paths if they are not in your system's PATH.
// For example, on a Linux server:
// ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
// ffmpeg.setFfprobePath('/usr/bin/ffprobe');
// Adjust these paths according to your server's installation of ffmpeg.

/**
 * Create Lesson
 *
 * - Expects fields:
 * title, subject, description, relatedQuizzes (JSON stringified array), grade
 * - Requires exactly one `video` file upload via Multer.
 */
router.post('/', auth, multer.single('video'), async (req, res, next) => {
  try {
    // 1. Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required for lessons.' });
    }

    const { title, subject, description, relatedQuizzes, grade } = req.body;

    // 2. Validate required fields
    if (!grade || isNaN(grade)) {
      return res.status(400).json({ message: 'Grade is required and must be a number.' });
    }
    if (!title || !subject || !description) {
        return res.status(400).json({ message: 'Title, subject, and description are required.' });
    }

    const videoFilePath = req.file.path; // This is the path where Multer saved the uploaded video (e.g., 'uploads/some_user_id/videos/my_video.mp4')
    let generatedThumbnailPath = null; // Initialize to null; will be updated if thumbnail generation succeeds

    // --- 3. Thumbnail Generation Logic ---
    // Extract the video filename (without extension) and its directory
    const videoFileName = path.parse(req.file.filename).name; // e.g., 'my_video' from 'my_video.mp4'
    const videoDirectory = path.dirname(videoFilePath);       // e.g., 'uploads/some_user_id/videos'

    // Define the directory where thumbnails will be saved (e.g., a 'thumbnails' subfolder)
    const thumbnailDir = path.join(videoDirectory, 'thumbnails');
    // Define the filename for the thumbnail (e.g., 'my_video-thumb.jpg')
    const thumbnailFileName = `${videoFileName}-thumb.jpg`;
    // Define the full absolute path where the thumbnail will be saved on the server
    const fullThumbnailSavePath = path.join(thumbnailDir, thumbnailFileName);

    // Ensure the thumbnail directory exists. Create it if it doesn't.
    if (!fs.existsSync(thumbnailDir)) {
      try {
        fs.mkdirSync(thumbnailDir, { recursive: true });
        console.log(`Created thumbnail directory: ${thumbnailDir}`);
      } catch (mkdirErr) {
        console.error(`Failed to create thumbnail directory ${thumbnailDir}:`, mkdirErr);
        // Decide if you want to abort or continue without thumbnail.
        // For robustness, we'll continue.
      }
    }

    // Use a Promise to await the ffmpeg screenshot operation
    try {
      await new Promise((resolve) => { // Using resolve() even on error to not block lesson creation
        ffmpeg(videoFilePath)
          .screenshots({
            timestamps: ['00:00:1.000'], // Take a screenshot at 1 second into the video
            filename: thumbnailFileName,   // Name of the output thumbnail file
            folder: thumbnailDir,          // Directory to save the thumbnail
            size: '320x240'                // Dimensions of the thumbnail (width x height)
          })
          .on('end', () => {
            // Success: Thumbnail generated
            console.log(`Thumbnail successfully generated for: ${videoFileName}`);
            // Store the path relative to the project root, replacing backslashes for URL compatibility
            // This path will be stored in MongoDB and used by the frontend
            generatedThumbnailPath = fullThumbnailSavePath.replace(/\\/g, '/');
            resolve();
          })
          .on('error', (err) => {
            // Error during thumbnail generation
            console.error(`Error generating thumbnail for ${videoFileName}:`, err.message);
            // Log the error but still resolve so the lesson can be saved without a thumbnail
            generatedThumbnailPath = null; // Ensure it's null if generation failed
            resolve();
          });
      });
    } catch (ffmpegPromiseError) {
      // This catch block handles errors within the promise itself, not just ffmpeg errors
      console.error("Promise error during FFmpeg operation:", ffmpegPromiseError);
      generatedThumbnailPath = null;
    }

    // 4. Create and save the Lesson document
    const lesson = new Lesson({
      lessonId: nanoid(8), // Generate a short unique ID for the lesson
      user: req.user.id,   // User ID from authentication middleware
      title,
      subject,
      description,
      // Parse relatedQuizzes from JSON string if provided, otherwise default to empty array
      relatedQuizzes: relatedQuizzes ? JSON.parse(relatedQuizzes) : [],
      // Store the video file path (ensure forward slashes for cross-OS compatibility)
      video: videoFilePath.replace(/\\/g, '/'),
      thumbnailPath: generatedThumbnailPath, // Store the path to the generated thumbnail
      grade: parseInt(grade, 10)             // Ensure grade is stored as a number
    });

    await lesson.save(); // Save the new lesson to MongoDB

    // 5. Send success response
    res.status(201).json({ message: 'Lesson created successfully', lesson });

  } catch (err) {
    // 6. Handle any unexpected errors during the process
    console.error('Error creating lesson:', err);
    // Pass the error to the next error-handling middleware
    next(err);
  }
});

/*
// List Lessons (Optional - often handled by searchRoutes.js)
// If you uncomment this, ensure it's not conflicting with other routes
// router.get('/', async (req, res, next) => {
//   try {
//     const list = await Lesson.find();
//     res.json(list);
//   } catch (err) {
//     next(err);
//   }
// });

// Lesson detail (Optional - often handled by searchRoutes.js)
// If you uncomment this, ensure it's not conflicting with other routes
// router.get('/:lessonId', async (req, res, next) => {
//   try {
//     const lesson = await Lesson.findOne({ lessonId: req.params.lessonId });
//     if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
//     res.json(lesson);
//   } catch (err) {
//     next(err);
//   }
// });
*/

module.exports = router;