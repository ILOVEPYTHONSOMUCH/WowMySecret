// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

// routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const quizRoutes = require('./routes/quizRoutes.js');
const lessonRoutes = require('./routes/lessonRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// --- 1) CORS & Body Parser ---
app.use(cors({
  origin: ['http://localhost:8081', 'exp://127.0.0.1:19000'],
  methods: ['GET','POST','PUT','DELETE']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- 2) Static uploads folder ---
app.use('/uploads', express.static('uploads'));

// --- 3) Mount routes ---
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
chatRoutes(app); // if this is a function accepting app/socket

// --- 4) Error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'ไฟล์ใหญ่เกินขนาดที่กำหนด' });
  }
  res.status(err.status || 500).json({ message: err.message });
});

// --- 5) Connect DB & start server ---
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
