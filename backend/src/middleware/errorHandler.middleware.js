const { ApiError } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const env = require('../config/env');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // PostgreSQL specific error codes
  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with this value already exists';
  } else if (err.code === '23503') {
    statusCode = 409;
    message = 'This action violates a data relationship constraint';
  } else if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid input format';
  }

  if (statusCode === 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${err.stack || err.message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${statusCode}: ${message}`);
  }

  const response = { success: false, message };
  if (errors.length) response.errors = errors;
  if (env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };