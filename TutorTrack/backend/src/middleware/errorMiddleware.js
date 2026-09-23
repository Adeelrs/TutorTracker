const ApiError = require('../utils/apiError');

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Something went wrong',
    details: error instanceof ApiError ? error.details : null,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};

