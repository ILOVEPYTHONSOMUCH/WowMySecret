// server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const quizRoutes = require('./routes/quizRoutes');
const videoRoutes = require('./routes/videos');
const chatRoutes = require('./routes/chat');

const app = express();

// 1) เปิด CORS สำหรับ React Native (ปรับ origin ตามจริง)
app.use(cors({ origin: ['http://localhost:8081', 'exp://127.0.0.1:19000'] }));

// 2) Parse JSON และ URL-encoded bodies (limit ป้องกัน DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3) เส้นทางสำหรับไฟล์อัปโหลด
app.use('/uploads', express.static('uploads'));

// 4) Mount routers
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/videos', videoRoutes);
chatRoutes(app);   // หาก chatRoutes เป็นฟังก์ชันที่รับ app/socket

// 5) Error handling middleware (ท้ายสุด)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'ไฟล์ใหญ่เกินขนาดที่กำหนด' });
  }
  res.status(err.status || 500).json({ message: err.message });
});

// Connect DB and start
connectDB();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
