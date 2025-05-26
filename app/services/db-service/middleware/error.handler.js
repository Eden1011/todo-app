const {
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
} = require("@prisma/client");

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

    // Obsługa błędów Prisma
    if (err instanceof PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2002":
                statusCode = 409;
                message = getUniqueConstraintMessage(err.meta);
                break;
            case "P2025":
                statusCode = 404;
                message = "Resource not found";
                break;
            case "P2014":
                statusCode = 400;
                message = "Invalid reference to another record";
                break;
            default:
                statusCode = 400;
                message = "Database error occurred";
        }
    }

    if (err instanceof PrismaClientValidationError) {
        statusCode = 400;
        message = "Invalid data provided";
    }

    // Obsługa błędów walidacji express-validator
    if (err.errors && Array.isArray(err.errors)) {
        statusCode = 400;
        message = "Validation failed";
        return res.status(statusCode).json({
            success: false,
            error: message,
            details: err.errors,
        });
    }

    // Obsługa błędów rate limit
    if (err.message && err.message.includes("Too many")) {
        statusCode = 429;
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

function getUniqueConstraintMessage(meta) {
    if (meta && meta.target) {
        const field = Array.isArray(meta.target) ? meta.target[0] : meta.target;
        switch (field) {
            case "name":
                return "Name already exists";
            case "authId":
                return "User ID already exists";
            default:
                return `${field} already exists`;
        }
    }
    return "Duplicate value not allowed";
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

module.exports = {
    errorHandler,
    notFound,
    AppError,
    asyncHandler,
};
