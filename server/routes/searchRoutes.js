// server/routes/searchRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming your auth middleware is here
const Lesson = require('../models/Lesson');
const Post = require('../models/Post');
const Quiz = require('../models/Quiz'); // Make sure Quiz model is imported

/**
 * Build a case-insensitive regex filter
 */
function makeRegex(q) {
    return { $regex: q, $options: 'i' };
}

// Apply the authentication middleware to this route
router.get('/:type', auth, async (req, res, next) => {
    try {
        const { type } = req.params; // 'lessons' | 'posts' | 'quizzes'
        const { keyword, grade, debug } = req.query; // 'grade' will now be used for quizzes too

        // The user's ID is available via req.user.id after auth middleware runs
        // console.log("User ID from auth middleware:", req.user.id);

        // parse grade if valid
        const gradeParsed = grade != null && !isNaN(+grade) ? +grade : null;

        // build filter object
        const filter = {};

        // 1) grade filter (implicit AND) - Applies to quizzes and lessons now
        if (gradeParsed !== null) {
            filter.grade = gradeParsed;
        }

        // 2) keyword filter across title + description
        if (keyword) {
            const re = makeRegex(keyword);
            if (type === 'lessons' || type === 'posts') {
                filter.$or = [
                    { title: re },
                    { description: re }
                ];
            } else if (type === 'quizzes') {
                filter.$or = [
                    { title: re },
                    { subject: re } // Assuming quizzes have a 'subject' field
                ];
            }
        }

        // pick model
        let Model;
        let selectFields = '';
        let populateFields = ''; // New variable for populate fields

        if (type === 'lessons') {
            Model = Lesson;
            selectFields = 'title subject description video thumbnailPath grade viewsCount likesCount dislikesCount CommentCount';
            populateFields = 'user'; // Populate user for lessons
        } else if (type === 'posts') {
            Model = Post;
            // No specific selectFields or populateFields defined for posts in original, keeping it as is.
        } else if (type === 'quizzes') {
            Model = Quiz;
            // Select fields relevant to quiz display based on your new model
            // Include 'user' for population, 'grade' as it's a new filterable field
            selectFields = 'quizId title subject grade questions coverImage attemptsCount user';
            populateFields = 'user'; // Populate the 'user' field (was 'creator')
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        // run query
        let query = Model.find(filter);

        if (selectFields) {
            query = query.select(selectFields);
        }

        if (populateFields) {
            // Populate 'user' for Lessons and Quizzes
            query = query.populate(populateFields, 'username avatar'); // Only fetch username and avatar
        }

        const results = await query.lean();

        // If quizzes, map to include user's username directly
        let finalResults = results;
        if (type === 'quizzes') {
            finalResults = results.map(quiz => ({
                ...quiz,
                creatorUsername: quiz.user ? quiz.user.username : 'Unknown', // Use quiz.user
                creatorAvatar: quiz.user ? quiz.user.avatar : null,         // Use quiz.user
                user: undefined // Remove the original user object if not needed
            }));
        }


        // debug?
        if (debug === 'true') {
            return res.json({
                filter,
                count: finalResults.length,
                data: finalResults
            });
        }

        return res.json(finalResults);
    } catch (err) {
        console.error(`Error in searchRoutes for type ${req.params.type}:`, err);
        res.status(500).json({ message: 'Failed to perform search.', error: err.message });
    }
});

module.exports = router;