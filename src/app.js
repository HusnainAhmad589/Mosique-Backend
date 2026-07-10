const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const cookieParser = require('cookie-parser');
const path     = require('path');
require('dotenv').config();

// Routes
const authRoutes      = require('./routes/authRoutes');
const adminRoutes     = require('./routes/adminRoutes');
const artistRoutes    = require('./routes/artistRoutes');
const moderatorRoutes = require('./routes/moderatorRoutes');
const listenerRoutes  = require('./routes/listenerRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();

//  Security Middleware

app.use(helmet({
  crossOriginResourcePolicy: false,
})); // Sets secure HTTP headers

app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

//  General Middleware

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static assets (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

//  Health Check

app.get('/api/health', (req, res) => {
  res.json({
    success:     true,
    service:     'Mosique API',
    version:     '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

//  API Routes

app.use('/api/auth',      authRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/artist',    artistRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/listener',  listenerRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);

//  404 Handler

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

//  Global Error Handler

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});

module.exports = app;
