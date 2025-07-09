// server/routes/userinfo.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * GET /api/users/:id
 * Public endpoint: returns basic info for the user with _id = :id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch only the public fields
    const user = await User.findById(id)
      .select('username email grade skills strengths weaknesses avatar')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If skills are nested under a "skills" object, adjust as needed:
    const response = {
      username: user.username,
      email:    user.email,
      grade:    user.grade,
      skills: {
        strengths: user.skills?.strengths || [],
        weaknesses: user.skills?.weaknesses || []
      },
      avatar:   user.avatar  // e.g. 'uploads/<userId>/images/…'
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
