// server/routes/fileRoute.js

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');

router.get('/', (req, res) => {
  const relPath = req.query.path;  
  if (!relPath) {
    return res.status(400).json({ error: 'path query param required' });
  }

  // Reject directory traversal attempts
  if (relPath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // === CHANGE HERE: go up two levels to reach your real uploads folder ===
  // __dirname: server/routes
  // path.resolve(__dirname, '..', '..', 'uploads') → server/server/uploads
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');

  // Strip any leading "uploads/" so we can join
  let safePath = relPath;
  if (safePath.startsWith('uploads/')) {
    safePath = safePath.slice('uploads/'.length);
  }
  safePath = safePath.replace(/^[/\\]+/, ''); // remove leading slashes

  // Compute absolute path
  const absPath = path.resolve(uploadsDir, safePath);

  // Ensure it's still inside the uploadsDir
  if (!absPath.startsWith(uploadsDir + path.sep)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check for existence
  if (!fs.existsSync(absPath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Send the file
  res.sendFile(absPath, err => {
    if (err) {
      console.error('sendFile error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error sending file' });
      }
    }
  });
});

module.exports = router;
