const rateLimit = require("express-rate-limit");

// Check if we're in development/test mode
const isDevelopment =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === "true";

// Create a pass-through middleware for development
const createLimiter = (options) => {
    if (isDevelopment || disableRateLimit) {
        // Return a pass-through middleware in development
        return (req, res, next) => next();
    }
    return rateLimit(options);
};

// General API rate limiting
const generalLimiter = createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Task creation rate limiting
const createTaskLimiter = createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 task creations per 5 minutes
    message: "Too many task creation requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Creation operations rate limiting (categories, tags, projects)
const createResourceLimiter = createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 15, // 15 resource creations per 5 minutes
    message: "Too many resource creation requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Search and query rate limiting
const searchLimiter = createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 search requests per minute
    message: "Too many search requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Export rate limiting
const exportLimiter = createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 export requests per 15 minutes
    message: "Too many export requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Notification operations rate limiting
const notificationLimiter = createLimiter({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 20, // 20 notification operations per 2 minutes
    message: "Too many notification requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Statistics and analytics rate limiting
const statsLimiter = createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 stats requests per 5 minutes
    message: "Too many statistics requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Delete operations rate limiting
const deleteLimiter = createLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // 20 delete operations per 10 minutes
    message: "Too many delete requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Update operations rate limiting
const updateLimiter = createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 update operations per 5 minutes
    message: "Too many update requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    createTaskLimiter,
    createResourceLimiter,
    searchLimiter,
    exportLimiter,
    notificationLimiter,
    statsLimiter,
    deleteLimiter,
    updateLimiter,
};
