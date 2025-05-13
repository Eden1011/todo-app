const { PrismaClientKnownRequestError, PrismaClientValidationError } = require('@prisma/client');
const { validationResult } = require("express-validator")


class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, _) {
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = getUniqueConstraintMessage(err.meta);
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid reference to another record';
        break;
      default:
        statusCode = 400;
        message = 'Database error occurred';
    }
  }

  if (err instanceof PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.errors && Array.isArray(err.errors)) {
    statusCode = 400;
    message = 'Validation failed';
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: err.errors
    });
  }

  if (err.message && err.message.includes('Too many')) {
    statusCode = 429;
  }

  const errorResponse = {
    success: false,
    error: message
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.meta || err.details;
  }

  res.status(statusCode).json(errorResponse);
}

function getUniqueConstraintMessage(meta) {
  if (meta && meta.target) {
    const field = Array.isArray(meta.target) ? meta.target[0] : meta.target;
    switch (field) {
      case 'username':
        return 'Username already exists';
      case 'email':
        return 'Email already exists';
      case 'token':
        return 'Token already exists';
      default:
        return `${field} already exists`;
    }
  }
  return 'Duplicate value not allowed';
}

function notFound(req, _, next) {
  const error = new AppError(`Route ${req.path} not found`, 404);
  next(error);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function handleValidationErrors(req, _, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new AppError('Validation failed', 400);
    error.errors = errors.array();
    return next(error);
  }
  next();
}

module.exports = {
  errorHandler,
  notFound,
  AppError,
  asyncHandler,
  handleValidationErrors
}
