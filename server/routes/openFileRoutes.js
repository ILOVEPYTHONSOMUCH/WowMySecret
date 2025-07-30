// Backend Code (file.js)
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/', (req, res) => {
  try {
    // 1. Get and decode path parameter
    const encodedPath = req.query.path;
    if (!encodedPath) {
      return res.status(400).send('File path is required');
    }
    
    // Decode URI component twice to handle double encoding
    const decodedPath = decodeURIComponent(decodeURIComponent(encodedPath));
    
    // 2. Construct absolute path
    const absolutePath = path.resolve(__dirname, '../../', decodedPath);
    
    // 3. Security check
    const allowedBase = path.resolve(__dirname, '../../uploads');
    if (!absolutePath.startsWith(allowedBase)) {
      return res.status(403).send('Access denied');
    }

    // 4. Check file existence
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send('File not found');
    }

    // 5. Stream file with proper headers
    const filename = path.basename(absolutePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).end();
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;