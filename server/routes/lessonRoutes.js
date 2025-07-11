const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Path to your authentication middleware
const multer = require('../config/multerConfig'); // Path to your Multer configuration
// const { nanoid } = require('nanoid'); // No longer needed as we rely on Mongoose _id
const Lesson = require('../models/Lesson'); // Path to your Lesson Mongoose model

// New imports required for thumbnail generation
const ffmpeg = require('fluent-ffmpeg'); // For interacting with ffmpeg
const path = require('path');           // For handling file paths
const fs = require('fs');               // For file system operations (e.g., checking/creating directories)

// Set ffmpeg and ffprobe paths (Adjust these paths according to your system)
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
ffmpeg.setFfprobePath('C:\\ffmpeg\\bin\\ffprobe.exe');

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

        const videoFilePath = req.file.path; // This is the path where Multer saved the uploaded video
        let generatedThumbnailPath = null; // Initialize to null; will be updated if thumbnail generation succeeds

        // --- 3. Thumbnail Generation Logic ---
        const videoFileName = path.parse(req.file.filename).name;
        const videoDirectory = path.dirname(videoFilePath);

        const thumbnailDir = path.join(videoDirectory, 'thumbnails');
        const thumbnailFileName = `${videoFileName}-thumb.jpg`;
        const fullThumbnailSavePath = path.join(thumbnailDir, thumbnailFileName);

        if (!fs.existsSync(thumbnailDir)) {
            try {
                fs.mkdirSync(thumbnailDir, { recursive: true });
                console.log(`Created thumbnail directory: ${thumbnailDir}`);
            } catch (mkdirErr) {
                console.error(`Failed to create thumbnail directory ${thumbnailDir}:`, mkdirErr);
            }
        }

        try {
            await new Promise((resolve) => {
                ffmpeg(videoFilePath)
                    .screenshots({
                        timestamps: ['00:00:1.000'],
                        filename: thumbnailFileName,
                        folder: thumbnailDir,
                        size: '320x240'
                    })
                    .on('end', () => {
                        console.log(`Thumbnail successfully generated for: ${videoFileName}`);
                        generatedThumbnailPath = fullThumbnailSavePath.replace(/\\/g, '/');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error(`Error generating thumbnail for ${videoFileName}:`, err.message);
                        generatedThumbnailPath = null;
                        resolve();
                    });
            });
        } catch (ffmpegPromiseError) {
            console.error("Promise error during FFmpeg operation:", ffmpegPromiseError);
            generatedThumbnailPath = null;
        }

        // 4. Create and save the Lesson document
        const lesson = new Lesson({
            // Removed: lessonId: nanoid(8), // Rely on Mongoose's default _id
            user: req.user.id,
            title,
            subject,
            description,
            relatedQuizzes: relatedQuizzes ? JSON.parse(relatedQuizzes) : [],
            video: videoFilePath.replace(/\\/g, '/'),
            thumbnailPath: generatedThumbnailPath,
            grade: parseInt(grade, 10)
        });

        await lesson.save();

        // 5. Send success response
        res.status(201).json({ message: 'Lesson created successfully', lesson });

    } catch (err) {
        console.error('Error creating lesson:', err);
        next(err);
    }
});


// New route for listing lessons based on grade and search, including user interaction status
// This route simulates the one you described in LessonScreen.js's fetchLessonsAndUser
router.get('/search', auth, async (req, res, next) => {
    try {
        const { grade, search } = req.query; // Expect grade as a query parameter

        let query = {};
        if (grade) {
            query.grade = parseInt(grade, 10);
            if (isNaN(query.grade)) {
                return res.status(400).json({ message: 'Invalid grade provided.' });
            }
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
            query.$or = [
                { title: searchRegex },
                { subject: searchRegex },
                // Assuming 'user.username' is populated, direct search on populated fields
                // might need a separate lookup or a more complex aggregation pipeline
                // For simplicity, we'll only search on direct lesson fields for now.
                // If you need to search by username, you'd populate users first, then filter in memory
                // or use Mongoose aggregation.
            ];
        }

        let lessons = await Lesson.find(query)
            .populate('user', 'username avatar') // Populate user details
            .select('-__v') // Exclude __v field
            .sort({ createdAt: -1 }); // Sort by newest first

        // For each lesson, determine if the current user has liked or disliked it
        const userId = req.user.id;
        const lessonsWithInteraction = lessons.map(lesson => {
            const lessonObj = lesson.toObject(); // Convert to plain JS object

            lessonObj.isLiked = lessonObj.likes.includes(userId);
            lessonObj.isDisliked = lessonObj.dislikes.includes(userId);
            lessonObj.likesCount = lessonObj.likes.length;
            lessonObj.dislikesCount = lessonObj.dislikes.length;
            // commentsCount is assumed to be directly on the lesson model from your client code
            // If it's not, you'd need to calculate it (e.g., Lesson.aggregate) or remove it.
            // lessonObj.commentsCount = lessonObj.comments.length; // If comments is an array of subdocuments/refs

            // Remove the raw likes and dislikes arrays to simplify the response
            delete lessonObj.likes;
            delete lessonObj.dislikes;

            return lessonObj;
        });

        res.json(lessonsWithInteraction);
    } catch (err) {
        console.error('Error fetching lessons for search:', err);
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