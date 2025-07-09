const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload.id must be the Mongo _id string
    req.user = { id: payload.id };
    next();
  } catch (err) {
    console.error('JWT error', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
