const { AppError } = require("./error.handler.js")

class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409);
  }
}

module.exports = {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError
}
