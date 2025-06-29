const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
require('dotenv').config();

const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const quizRoutes = require('./routes/quizzes');
const videoRoutes = require('./routes/videos');
const chatRoutes = require('./routes/chat');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
// Connect DB
connectDB();

// Middlewares
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/chat', chatRoutes(io));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));