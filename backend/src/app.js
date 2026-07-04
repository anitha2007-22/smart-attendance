const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const xss = require('xss-clean');

const env = require('./config/env');
const routes = require('./routes');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');
const logger = require('./utils/logger');

const app = express();

// Security headers
app.use(helmet());

// CORS - restrict to configured client origin(s)
const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// XSS sanitization on request body/query/params
app.use(xss());

// Request logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// Global rate limiting
app.use(env.API_PREFIX, generalLimiter);

// Routes
app.use(env.API_PREFIX, routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Attendance Monitoring System API',
    version: '1.0.0',
    docs: `${env.API_PREFIX}/health`,
  });
});

// 404 + error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;