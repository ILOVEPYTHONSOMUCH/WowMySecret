// routes/commentRoute.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import Mongoose Models
const Comment = require('../models/Comment');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Post = require('../models/Post');

// Import Authentication Middleware
const authenticateToken = require('../middleware/auth');

// Helper function to update comments count
const updateCommentsCount = async (contentType, contentId, increment) => {
    try {
        const updateOperation = { $inc: { commentsCount: increment } };
        const options = { new: true, runValidators: true };

        if (contentType === 'Lesson') {
            await Lesson.findByIdAndUpdate(contentId, updateOperation, options);
        } else if (contentType === 'Post') {
            await Post.findByIdAndUpdate(contentId, updateOperation, options);
        }
        console.log(`Successfully updated commentsCount for ${contentType} ${contentId}`);
    } catch (updateError) {
        console.error(`Failed to update commentsCount for ${contentType} ${contentId}:`, updateError);
        throw new Error(`Failed to update comments count: ${updateError.message}`);
    }
};

// Fetch Comments for a Specific Content
router.get('/content/:contentId', authenticateToken, async (req, res) => {
    try {
        const { contentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return res.status(400).json({ message: 'Invalid content ID format.' });
        }

        const comments = await Comment.find({ content: contentId })
            .populate('user', 'username avatar')
            .sort({ createdAt: 1 });

        res.status(200).json(comments);

    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ 
            message: 'Server error while fetching comments.', 
            error: error.message 
        });
    }
});

// Add a New Comment
router.post('/content/:contentId', authenticateToken, async (req, res) => {
    try {
        const { contentId } = req.params;
        const { text, imagePath, videoPath, contentType } = req.body;

        // Input validation
        if (!text && !imagePath && !videoPath) {
            return res.status(400).json({ message: 'Comment must contain text, an image, or a video.' });
        }
        
        if (!contentType || !['Lesson', 'Post'].includes(contentType)) {
            return res.status(400).json({ message: 'Invalid or missing content type. Must be "Lesson" or "Post".' });
        }
        
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return res.status(400).json({ message: 'Invalid content ID format.' });
        }

        // Verify parent content exists
        let existingContent;
        if (contentType === 'Lesson') {
            existingContent = await Lesson.findById(contentId);
        } else if (contentType === 'Post') {
            existingContent = await Post.findById(contentId);
        }

        if (!existingContent) {
            return res.status(404).json({ message: `${contentType} not found. Cannot add comment.` });
        }

        // Create new comment
        const newComment = new Comment({
            content: contentId,
            onModel: contentType,
            user: req.user.id,
            text: text,
            imagePath: imagePath,
            videoPath: videoPath
        });

        const savedComment = await newComment.save();

        // Update comment count in parent content
        await updateCommentsCount(contentType, contentId, 1);

        // Populate user details for response
        const populatedComment = await Comment.findById(savedComment._id)
            .populate('user', 'username avatar');

        res.status(201).json(populatedComment);

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ 
            message: 'Server error while adding comment.', 
            error: error.message 
        });
    }
});

// Delete a Specific Comment
router.delete('/:commentId', authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ message: 'Invalid comment ID format.' });
        }

        const commentToDelete = await Comment.findById(commentId);

        if (!commentToDelete) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        // Authorization check
        if (commentToDelete.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
        }

        const contentType = commentToDelete.onModel;
        const contentId = commentToDelete.content;

        // Delete the comment
        await Comment.deleteOne({ _id: commentId });

        // Update comment count in parent content
        await updateCommentsCount(contentType, contentId, -1);

        res.status(200).json({ message: 'Comment deleted successfully.' });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ 
            message: 'Server error while deleting comment.', 
            error: error.message 
        });
    }
});

// Delete a Specific Comment
router.delete('/:commentId', authenticateToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { commentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Invalid comment ID format.' });
        }

        const commentToDelete = await Comment.findById(commentId).session(session);

        if (!commentToDelete) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Comment not found.' });
        }

        // Authorization check
        if (commentToDelete.user.toString() !== req.user.id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
        }

        const contentType = commentToDelete.onModel;
        const contentId = commentToDelete.content;

        // Delete the comment
        await Comment.deleteOne({ _id: commentId }).session(session);

        // Update comment count in parent content
        await updateCommentsCount(contentType, contentId, -1);

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Comment deleted successfully.' });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error deleting comment:', error);
        res.status(500).json({ 
            message: 'Server error while deleting comment.', 
            error: error.message 
        });
    }
});

module.exports = router;