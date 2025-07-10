// server/routes/searchRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming your auth middleware is here
const Lesson = require('../models/Lesson');
const Post = require('../models/Post');
const Quiz = require('../models/Quiz');
const User = require('../models/User'); // <-- ADDED: Import the User model

/**
 * Build a case-insensitive regex filter
 */
function makeRegex(q) {
    return { $regex: q, $options: 'i' };
}

// Apply the authentication middleware to this route
router.get('/:type', auth, async (req, res, next) => {
    try {
        const { type } = req.params; // 'lessons' | 'posts' | 'quizzes' | 'users' <-- ADDED: 'users' type
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
            } else if (type === 'users') { // <-- ADDED: Keyword filter for users
                filter.$or = [
                    { username: re }, // Search by username
                    { email: re },    // Optionally search by email
                    { note: re }
                ];
            }
        }

        // pick model
        let Model;
        let selectFields = '';
        let populateFields = '';

        if (type === 'lessons') {
            Model = Lesson;
            selectFields = 'title subject description video thumbnailPath grade viewsCount likesCount dislikesCount CommentCount';
            populateFields = 'user';
        } else if (type === 'posts') {
            Model = Post;
            // No specific selectFields or populateFields defined for posts in original, keeping it as is.
        } else if (type === 'quizzes') {
            Model = Quiz;
            selectFields = 'quizId title subject grade questions coverImage attemptsCount user';
            populateFields = 'user';
        } else if (type === 'users') { // <-- ADDED: User Model
            Model = User;
            selectFields = '_id username email avatar note'; // Select relevant user fields
            // No populateFields needed when querying the User model directly
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        // run query
        let query = Model.find(filter);

        if (selectFields) {
            query = query.select(selectFields);
        }

        // Only populate if populateFields is defined and the Model is not User
        if (populateFields && type !== 'users') { // <-- MODIFIED: Exclude users from population
            query = query.populate(populateFields, 'username avatar');
        }

        const results = await query.lean();

        // If quizzes, map to include user's username directly
        let finalResults = results;
        if (type === 'quizzes') {
            finalResults = results.map(quiz => ({
                ...quiz,
                creatorUsername: quiz.user ? quiz.user.username : 'Unknown',
                creatorAvatar: quiz.user ? quiz.user.avatar : null,
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