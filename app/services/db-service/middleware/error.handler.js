const {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} = require("@prisma/client");
const { validationResult } = require("express-validator");
const {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("./error.custom.js");

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, _) {
  if (process.env.NODE_ENV !== "test") {
    console.error("Error occurred:", {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  if (
    err instanceof AuthenticationError ||
    err instanceof AuthorizationError ||
    err instanceof ValidationError ||
    err instanceof NotFoundError ||
    err instanceof ConflictError
  ) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        const error = new ConflictError();
        return errorHandler(error, req, res, _);
      case "P2025":
        const notFoundError = new NotFoundError();
        return errorHandler(notFoundError, req, res, _);
      case "P2014":
        const validationError = new ValidationError(
          "Invalid reference to another record",
        );
        return errorHandler(validationError, req, res, _);
      default:
        statusCode = 400;
        message = "Database error occurred";
    }
  }

  if (err instanceof PrismaClientValidationError) {
    const validationError = new ValidationError("Invalid data provided");
    return errorHandler(validationError, req, res, _);
  }

  if (err.errors && Array.isArray(err.errors)) {
    const validationError = new ValidationError();
    validationError.errors = err.errors;

    return res.status(validationError.statusCode).json({
      success: false,
      error: validationError.message,
      details: validationError.errors,
    });
  }

  const errorResponse = {
    success: false,
    error: message,
  };

  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    errorResponse.details = err.meta || err.details;
  }

  res.status(statusCode).json(errorResponse);
}

function notFound(req, _, next) {
  const error = new NotFoundError(`Route ${req.path} not found`);
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
    const error = new ValidationError();
    error.errors = errors.array();
    return next(error);
  }
  next();
}

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  handleValidationErrors,
  AppError,
};
