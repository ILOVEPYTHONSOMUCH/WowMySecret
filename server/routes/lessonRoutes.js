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


// Lesson detail with likes, dislikes, views, and comment count
router.get('/:id', auth, async (req, res, next) => { // Changed :lessonId to :id for consistency with _id
    try {
        const lesson = await Lesson.findById(req.params.id) // Use req.params.id
                                   .populate('user', 'username avatar')
                                   .populate('relatedQuizzes', 'title');

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        // Increment viewsCount
        lesson.viewsCount = (lesson.viewsCount || 0) + 1;
        await lesson.save();

        // Prepare response with additional counts and current user's interaction status
        const userId = req.user.id;
        const responseLesson = {
            ...lesson.toObject(),
            likesCount: lesson.likes.length,
            dislikesCount: lesson.dislikes.length,
            commentsCount: lesson.commentsCount, // Get commentsCount directly from the model
            isLiked: lesson.likes.includes(userId), // Check if current user liked
            isDisliked: lesson.dislikes.includes(userId), // Check if current user disliked
        };
        // Remove raw arrays for security/cleanliness if not needed on frontend
        delete responseLesson.likes;
        delete responseLesson.dislikes;

        res.json(responseLesson);
    } catch (err) {
        console.error('Error fetching lesson details:', err);
        next(err);
    }
});

// Like a lesson
router.post('/:id/like', auth, async (req, res, next) => { // Changed :lessonId to :id
    try {
        const lesson = await Lesson.findById(req.params.id); // Use req.params.id
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        const userId = req.user.id;
        const hasLiked = lesson.likes.includes(userId);
        const hasDisliked = lesson.dislikes.includes(userId);

        if (hasLiked) {
            // User already liked, so unlike (remove from likes array)
            lesson.likes = lesson.likes.filter(id => id.toString() !== userId.toString());
        } else {
            // User has not liked
            // If user has disliked, remove the dislike first
            if (hasDisliked) {
                lesson.dislikes = lesson.dislikes.filter(id => id.toString() !== userId.toString());
            }
            // Add user to likes array
            lesson.likes.push(userId);
        }

        await lesson.save();

        res.json({
            message: hasLiked ? 'Lesson unliked successfully.' : 'Lesson liked successfully.',
            likesCount: lesson.likes.length,
            dislikesCount: lesson.dislikes.length,
            isLiked: !hasLiked, // New status
            isDisliked: hasLiked && hasDisliked ? false : hasDisliked // If unliking and it was disliked, it stays disliked, else false
        });
    } catch (err) {
        console.error('Error liking lesson:', err);
        next(err);
    }
});

// Dislike a lesson
router.post('/:id/dislike', auth, async (req, res, next) => { // Changed :lessonId to :id
    try {
        const lesson = await Lesson.findById(req.params.id); // Use req.params.id
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        const userId = req.user.id;
        const hasDisliked = lesson.dislikes.includes(userId);
        const hasLiked = lesson.likes.includes(userId);

        if (hasDisliked) {
            // User already disliked, so un-dislike (remove from dislikes array)
            lesson.dislikes = lesson.dislikes.filter(id => id.toString() !== userId.toString());
        } else {
            // User has not disliked
            // If user has liked, remove the like first
            if (hasLiked) {
                lesson.likes = lesson.likes.filter(id => id.toString() !== userId.toString());
            }
            // Add user to dislikes array
            lesson.dislikes.push(userId);
        }

        await lesson.save();

        res.json({
            message: hasDisliked ? 'Lesson un-disliked successfully.' : 'Lesson disliked successfully.',
            likesCount: lesson.likes.length,
            dislikesCount: lesson.dislikes.length,
            isDisliked: !hasDisliked, // New status
            isLiked: hasDisliked && hasLiked ? false : hasLiked // If undisliking and it was liked, it stays liked, else false
        });
    } catch (err) {
        console.error('Error disliking lesson:', err);
        next(err);
    }
});

module.exports = router;