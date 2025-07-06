const express = require('express');
const router  = express.Router();
const Lesson  = require('../models/Lesson');
const Post    = require('../models/Post');
const Quiz    = require('../models/Quiz');

/**
 * Build a case‑insensitive regex filter
 */
function makeRegex(q) {
  return { $regex: q, $options: 'i' };
}

router.get('/:type', async (req, res, next) => {
  try {
    const { type }            = req.params;              // 'lessons' | 'posts' | 'quizzes'
    const { keyword, grade, debug } = req.query;

    // parse grade if valid
    const gradeParsed = grade != null && !isNaN(+grade) ? +grade : null;

    // build filter object
    const filter = {};

    // 1) grade filter (implicit AND)
    if (gradeParsed !== null) {
      filter.grade = gradeParsed;
    }

    // 2) keyword filter across title + description
    if (keyword) {
      const re = makeRegex(keyword);
      filter.$or = [
        { title:       re },
        { description: re }
      ];
    }

    // pick model
    let Model;
    if      (type === 'lessons')      Model = Lesson;
    else if (type === 'posts')        Model = Post;
    else if (type === 'quizzes')      Model = Quiz;
    else return res.status(400).json({ error: 'Invalid type' });

    // run query
    const results = await Model.find(filter).lean();

    // debug?
    if (debug === 'true') {
      return res.json({
        filter,
        count:  results.length,
        data:   results
      });
    }

    return res.json(results);
  }
  catch (err) {
    next(err);
  }
});

module.exports = router;
