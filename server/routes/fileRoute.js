// server/routes/fileRoute.js
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');

router.get('/', (req, res) => {
  const diskPath = req.query.path;
  if (!diskPath) {
    return res.status(400).json({ error: 'path query param required' });
  }

  // Normalize the provided path
  const resolved = path.resolve(diskPath);

  // Fix: match actual uploads directory path on your system
  const uploadsDir = path.resolve(__dirname, '..', 'server', 'uploads');

  // Ensure the resolved path is inside the uploads directory
  if (!resolved.startsWith(uploadsDir + path.sep)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check file exists
  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Send file
  res.sendFile(resolved);
});

module.exports = router;
