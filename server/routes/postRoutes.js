// server/routes/postRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('../config/multerConfig');
const Post = require('../models/Post'); // Assuming Post model has likes and dislikes arrays
const auth = require('../middleware/auth'); // Auth middleware to ensure user is logged in
const path = require('path'); // Import path module

// Define the base uploads directory. This must match your multerConfig's base.
// It's crucial this path calculation is consistent across your backend.
const UPLOADS_BASE_DIR = path.join(__dirname, '..', '..', 'uploads');

// Helper function to convert absolute path to relative, Unix-like path
function toRelativeUnixPath(absolutePath) {
  if (!absolutePath) return null;

  // Normalize path to use forward slashes (works on both Windows/Unix)
  const normalizedPath = absolutePath.replace(/\\/g, '/');

  // Find the index of the 'uploads/' segment.
  // We need to ensure we only capture the part *after* 'uploads/'.
  const uploadsIndex = normalizedPath.indexOf('/uploads/');

  if (uploadsIndex !== -1) {
    // Return the segment starting from 'uploads/'
    return normalizedPath.substring(uploadsIndex + 1); // +1 to remove leading '/'
  }
  // If 'uploads/' is not found (e.g., if path is already relative or unexpected format)
  // try to make it relative to UPLOADS_BASE_DIR
  try {
      const relativePath = path.relative(UPLOADS_BASE_DIR, absolutePath);
      // Ensure it starts with 'uploads/' and uses forward slashes
      return path.join('uploads', relativePath).replace(/\\/g, '/');
  } catch (e) {
    console.warn("Could not determine relative path for:", absolutePath, e);
    return normalizedPath; // Fallback to normalized absolute path if relative conversion fails
  }
}


// Create Post
router.post('/', auth, multer.any(), async (req, res, next) => {
  try {
    // Destructure the fields you expect:
    const { title, description, teachSubjects, learnSubjects, grade } = req.body;

    // Validate required fields
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }
    if (typeof grade === 'undefined' || grade === null) { // Added null check
      return res.status(400).json({ message: 'Grade is required.' });
    }
    const gradeInt = parseInt(grade, 10);
    if (isNaN(gradeInt)) {
      return res.status(400).json({ message: 'Grade must be a number.' });
    }

    // Confirm authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing.' });
    }

    // Build the Post document
    const post = new Post({
      title,
      description,
      // Parse JSON strings for arrays, default to empty array
      teachSubjects: JSON.parse(teachSubjects || '[]'),
      learnSubjects: JSON.parse(learnSubjects || '[]'),
      grade: gradeInt,
      user: userId, // owner from JWT
    });

    // Attach any uploaded image/video paths after converting to relative Unix-like paths
    const imageFile = req.files?.find(f => f.fieldname === 'image');
    const videoFile = req.files?.find(f => f.fieldname === 'video');

    if (imageFile) {
      post.image = toRelativeUnixPath(imageFile.path);
    }
    if (videoFile) {
      post.video = toRelativeUnixPath(videoFile.path);
    }

    // Save and return
    const saved = await post.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error in postRoutes.js (Create Post):", err); // Log the error for debugging
    next(err); // Pass error to Express's error handling middleware
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


module.exports = router;