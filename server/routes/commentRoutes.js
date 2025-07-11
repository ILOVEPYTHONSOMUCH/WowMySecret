// routes/commentRoute.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Required for isValidObjectId

// --- Import your Mongoose Models ---
// Adjust these paths based on your actual project structure
const Comment = require('../models/Comment'); // The updated Comment model
const User = require('../models/User');     // Your User model
const Lesson = require('../models/Lesson'); // Your Lesson model
const Post = require('../models/Post');     // Your Post model

// --- Import your Authentication Middleware ---
const authenticateToken = require('../middleware/auth'); // Path to your auth.js middleware


// --- Route 1: Fetch Comments for a Specific Content (Lesson or Post) ---
// GET /api/comments/content/:contentId
// This route fetches all comments related to a given lesson or post ID.
router.get('/content/:contentId', authenticateToken, async (req, res) => {
    try {
        const { contentId } = req.params;

        // Validate if the provided contentId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return res.status(400).json({ message: 'Invalid content ID format.' });
        }

        // Find comments where the 'content' field matches the provided contentId.
        // Populate the 'user' field to get the username and avatar of the comment author.
        // Sort by 'createdAt' in ascending order (1) to show oldest comments first,
        // or use -1 for newest comments first, as per your display preference.
        const comments = await Comment.find({ content: contentId })
            .populate('user', 'username avatar') // Select only username and avatar
            .sort({ createdAt: 1 }); // Sort by creation date, oldest first

        res.status(200).json(comments);

    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server error while fetching comments.', error: error.message });
    }
});


// --- Route 2: Add a New Comment to a Specific Content (Lesson or Post) ---
// POST /api/comments/content/:contentId
// This route allows an authenticated user to add a new comment.
router.post('/content/:contentId', authenticateToken, async (req, res) => {
    try {
        const { contentId } = req.params;
        // Destructure text, imagePath, videoPath, and contentType from the request body.
        // contentType is crucial for the polymorphic association.
        const { text, imagePath, videoPath, contentType } = req.body;

        // Input validation: Ensure at least one form of content (text, image, or video) is provided.
        if (!text && !imagePath && !videoPath) {
            return res.status(400).json({ message: 'Comment must contain text, an image, or a video.' });
        }
        // Validate contentType: It must be 'Lesson' or 'Post'.
        if (!contentType || !['Lesson', 'Post'].includes(contentType)) {
            return res.status(400).json({ message: 'Invalid or missing content type (onModel). Must be "Lesson" or "Post".' });
        }
        // Validate contentId format.
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return res.status(400).json({ message: 'Invalid content ID format.' });
        }

        // Verify if the parent content (Lesson or Post) actually exists in the database.
        // This prevents comments from being added to non-existent content.
        let existingContent;
        if (contentType === 'Lesson') {
            existingContent = await Lesson.findById(contentId);
        } else if (contentType === 'Post') {
            existingContent = await Post.findById(contentId);
        }

        if (!existingContent) {
            return res.status(404).json({ message: `${contentType} not found. Cannot add comment.` });
        }

        // Create a new Comment document based on the schema.
        const newComment = new Comment({
            content: contentId,      // The ID of the parent content (Lesson or Post)
            onModel: contentType,    // The model name ('Lesson' or 'Post')
            user: req.user._id,      // The ID of the authenticated user from the middleware
            text: text,              // Text content of the comment
            imagePath: imagePath,    // Path to uploaded image (if any)
            videoPath: videoPath,    // Path to uploaded video (if any)
        });

        // Save the new comment to the database.
        await newComment.save();

        // Populate user details for the response. This sends back the comment
        // with the user's username and avatar, so the frontend can display it immediately
        // without needing another fetch.
        const populatedComment = await Comment.findById(newComment._id)
                                            .populate('user', 'username avatar');

        res.status(201).json(populatedComment); // Respond with the newly created and populated comment

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error while adding comment.', error: error.message });
    }
});


// --- Route 3: Delete a Specific Comment ---
// DELETE /api/comments/:commentId
// This route allows an authenticated user to delete their own comment.
router.delete('/:commentId', authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params;

        // Validate commentId format.
        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ message: 'Invalid comment ID format.' });
        }

        // Find the comment to be deleted.
        const commentToDelete = await Comment.findById(commentId);

        if (!commentToDelete) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        // Authorization check: Ensure only the user who created the comment can delete it.
        // Convert ObjectIds to string for comparison.
        if (commentToDelete.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
        }

        // Delete the comment from the database.
        await Comment.deleteOne({ _id: commentId }); // Or use findByIdAndDelete(commentId)

        res.status(200).json({ message: 'Comment deleted successfully.' });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Server error while deleting comment.', error: error.message });
    }
});


module.exports = router;