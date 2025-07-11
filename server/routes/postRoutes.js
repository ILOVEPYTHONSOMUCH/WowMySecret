// server/routes/postRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('../config/multerConfig');
const Post = require('../models/Post'); // Ensure your Post model is correctly imported
const Comment = require('../models/Comment'); // <-- NEW: Import Comment model
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const ffmpeg = require('fluent-ffmpeg');
const mongoose = require('mongoose'); // <-- ADDED: Import Mongoose for ObjectId validation

// Configure ffmpeg paths (adjust according to your environment)
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
ffmpeg.setFfprobePath('C:\\ffmpeg\\bin\\ffprobe.exe');

// Helper function to convert paths to relative Unix format
function toRelativeUnixPath(absolutePath) {
  if (!absolutePath) return null;
  const normalizedPath = absolutePath.replace(/\\/g, '/');
  const uploadsIndex = normalizedPath.indexOf('/uploads/');
  return uploadsIndex !== -1
    ? normalizedPath.substring(uploadsIndex + 1)
    : normalizedPath;
}

// Create Post with video and thumbnail support
router.post('/', auth, multer.any(), async (req, res, next) => {
  try {
    // Validate required fields
    const { title, description, teachSubjects, learnSubjects, grade } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }
    if (typeof grade === 'undefined' || grade === null) {
      return res.status(400).json({ message: 'Grade is required.' });
    }

    const gradeInt = parseInt(grade, 10);
    if (isNaN(gradeInt)) {
      return res.status(400).json({ message: 'Grade must be a number.' });
    }

    // Check user authentication and validate userId
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { // <-- MODIFIED: Added validation
      console.error('Unauthorized: Invalid User ID received:', userId);
      return res.status(401).json({ message: 'Unauthorized: Invalid User ID.' });
    }

    // Process uploaded files
    const imageFile = req.files?.find(f => f.fieldname === 'image');
    const videoFile = req.files?.find(f => f.fieldname === 'video');

    let thumbnailPath = null;

    // Generate thumbnail if video was uploaded
    if (videoFile) {
      const videoFilePath = videoFile.path;
      const videoFileName = path.parse(videoFile.filename).name;
      const videoDirectory = path.dirname(videoFilePath);
      const thumbnailDir = path.join(videoDirectory, 'thumbnails');
      const thumbnailFileName = `${videoFileName}-thumb.jpg`;
      const fullThumbnailPath = path.join(thumbnailDir, thumbnailFileName);

      // Create thumbnail directory if it doesn't exist
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      // Generate thumbnail using ffmpeg
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
              thumbnailPath = toRelativeUnixPath(fullThumbnailPath);
              resolve();
            })
            .on('error', (err) => {
              console.error('Thumbnail generation error:', err);
              resolve();
            });
        });
      } catch (err) {
        console.error('Error in thumbnail generation:', err);
      }
    }

    // Create new post
    const post = new Post({
      title,
      description,
      teachSubjects: JSON.parse(teachSubjects || '[]'),
      learnSubjects: JSON.parse(learnSubjects || '[]'),
      grade: gradeInt,
      user: userId,
      image: imageFile ? toRelativeUnixPath(imageFile.path) : null,
      video: videoFile ? toRelativeUnixPath(videoFile.path) : null,
      thumbnail: thumbnailPath,
      viewsCount: 0 // Initialize viewsCount for new posts
    });

    const savedPost = await post.save();
    res.status(201).json(savedPost);

  } catch (err) {
    console.error("Error creating post:", err);
    next(err);
  }
});

// --- New Endpoints for Like/Dislike System ---

/**
 * @route POST /api/posts/:id/like
 * @desc Like or Unlike a post
 * @access Private
 */
router.post('/:id/like', auth, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id; // User ID from authenticated token

    // Validate userId here too, as it's used in includes and push operations
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { // <-- MODIFIED: Added validation
      console.error('Invalid User ID received for like:', userId);
      return res.status(401).json({ message: 'Unauthorized: Invalid User ID.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const isLiked = post.likes.includes(userId);
    const isDisliked = post.dislikes.includes(userId);

    if (isLiked) {
      // If already liked, unlike it (remove user ID from likes array)
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // If not liked, add user ID to likes array
      post.likes.push(userId);
      // If user had previously disliked, remove their ID from dislikes array
      if (isDisliked) {
        post.dislikes = post.dislikes.filter(id => id.toString() !== userId.toString());
      }
    }

    await post.save();
    res.status(200).json({
      message: isLiked ? 'Post unliked successfully.' : 'Post liked successfully.',
      likesCount: post.likes.length,
      dislikesCount: post.dislikes.length,
      isLikedByUser: post.likes.includes(userId),
      isDislikedByUser: post.dislikes.includes(userId)
    });

  } catch (err) {
    console.error('Error liking post:', err);
    next(err);
  }
});

/**
 * @route POST /api/posts/:id/dislike
 * @desc Dislike or Undislike a post
 * @access Private
 */
router.post('/:id/dislike', auth, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id; // User ID from authenticated token

    // Validate userId here too
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { // <-- MODIFIED: Added validation
      console.error('Invalid User ID received for dislike:', userId);
      return res.status(401).json({ message: 'Unauthorized: Invalid User ID.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const isDisliked = post.dislikes.includes(userId);
    const isLiked = post.likes.includes(userId);

    if (isDisliked) {
      // If already disliked, undislike it (remove user ID from dislikes array)
      post.dislikes = post.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      // If not disliked, add user ID to dislikes array
      post.dislikes.push(userId);
      // If user had previously liked, remove their ID from likes array
      if (isLiked) {
        post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      }
    }

    await post.save();
    res.status(200).json({
      message: isDisliked ? 'Post undisliked successfully.' : 'Post disliked successfully.',
      likesCount: post.likes.length,
      dislikesCount: post.dislikes.length,
      isLikedByUser: post.likes.includes(userId),
      isDislikedByUser: post.dislikes.includes(userId)
    });

  } catch (err) {
    console.error('Error disliking post:', err);
    next(err);
  }
});

// --- NEW: Route to Increment Post Views ---
/**
 * @route POST /api/posts/:id/view
 * @desc Increment a post's view count
 * @access Public (no auth middleware, but you can add it if you want to track logged-in users only)
 */
router.post('/:id/view', async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { viewsCount: 1 } }, // Increment viewsCount by 1
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    res.status(200).json({ message: 'View count updated.', viewsCount: post.viewsCount });
  } catch (err) {
    console.error('Error incrementing view count:', err);
    next(err);
  }
});

// --- NEW/MODIFIED: Get All Posts (with commentCount and viewsCount) ---
/**
 * @route GET /api/posts
 * @desc Get all posts with user info, like/dislike counts, views, and comment counts
 * @access Public
 *
 * This route is conceptual if you didn't have one. If you have an existing one,
 * integrate the population and comment counting logic into it.
 */


// --- NEW/MODIFIED: Get Single Post by ID (with commentCount and viewsCount) ---
/**
 * @route GET /api/posts/:id
 * @desc Get a single post by ID with user info, like/dislike counts, views, and comment counts
 * @access Public
 *
 * This route is conceptual if you didn't have one. If you have an existing one,
 * integrate the population and comment counting logic into it.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId).populate('user', 'username avatar'); // Populate user details

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const commentCount = await Comment.countDocuments({ post: post._id }); // Count comments for this post

    res.status(200).json({
      ...post.toObject(),
      commentCount,
      viewsCount: post.viewsCount,
      likesCount: post.likes.length,
      dislikesCount: post.dislikes.length,
    });
  } catch (err) {
    console.error('Error fetching single post:', err);
    next(err);
  }
});

module.exports = router;