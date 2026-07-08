const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
require('dotenv').config();

// Routes
const authRoutes      = require('./routes/authRoutes');
const adminRoutes     = require('./routes/adminRoutes');
const artistRoutes    = require('./routes/artistRoutes');
const moderatorRoutes = require('./routes/moderatorRoutes');
const listenerRoutes  = require('./routes/listenerRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const app = express();

//  Security Middleware

app.use(helmet()); // Sets secure HTTP headers

app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

//  General Middleware

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


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
