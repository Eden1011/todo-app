const mongoose = require("mongoose");

class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

function errorHandler(err, req, res, next) {
    if (process.env.NODE_ENV !== "test") {
        console.error("Error occurred:", {
            message: err.message,
            stack:
                process.env.NODE_ENV === "development" ? err.stack : undefined,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
        });
    }

    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";

    // Handle MongoDB/Mongoose errors
    if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        message = "Validation failed";
        const errors = Object.values(err.errors).map((error) => ({
            field: error.path,
            message: error.message,
        }));

        return res.status(statusCode).json({
            success: false,
            error: message,
            details: errors,
        });
    }

    if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }

    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token";
    }

    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token expired";
    }

    // Handle express-validator errors
    if (err.errors && Array.isArray(err.errors)) {
        statusCode = 400;
        message = "Validation failed";
        return res.status(statusCode).json({
            success: false,
            error: message,
            details: err.errors,
        });
    }

    // Handle rate limit errors
    if (err.message && err.message.includes("Too many")) {
        statusCode = 429;
    }

    const errorResponse = {
        success: false,
        error: message,
    };

    if (process.env.NODE_ENV === "development") {
        errorResponse.stack = err.stack;
        errorResponse.details = err.details;
    }

    res.status(statusCode).json(errorResponse);
}

function notFound(req, res, next) {
    const error = new AppError(`Route ${req.path} not found`, 404);
    next(error);
}

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Socket error handler
function handleSocketError(socket, error) {
    console.error("Socket error:", {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
        timestamp: new Date().toISOString(),
    });

    socket.emit("error", {
        success: false,
        error: error.message || "An error occurred",
        timestamp: new Date().toISOString(),
    });
}

module.exports = {
    errorHandler,
    notFound,
    AppError,
    asyncHandler,
    handleSocketError,
};
