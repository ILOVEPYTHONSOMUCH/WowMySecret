// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new Error('User not found');
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
