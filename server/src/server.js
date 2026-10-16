require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const db = require('./config/database');
const { initializeSocket } = require('./sockets/socketHandler');

const authRoutes = require('./routes/authRoutes');
const queueRoutes = require('./routes/queueRoutes');
const bedRoutes = require('./routes/bedRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// Attach io instance to express app so controllers can emit events
app.set('io', io);
initializeSocket(io);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'CareSync Hospital OPD & Bed Tracker API',
    timestamp: new Date().toISOString()
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CareSync Hospital Server running on http://localhost:${PORT}`);
});

module.exports = { app, server };
