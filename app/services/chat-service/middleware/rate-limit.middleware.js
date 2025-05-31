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

// Chat creation rate limiting
const createChatLimiter = createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 chat creations per 5 minutes
    message: "Too many chat creation requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Message sending rate limiting (for API endpoints)
const sendMessageLimiter = createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute via API
    message: "Too many message requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Chat fetching rate limiting
const getChatLimiter = createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 chat fetch requests per minute
    message: "Too many chat fetch requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Message history fetching rate limiting
const getMessagesLimiter = createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 message history requests per minute
    message: "Too many message history requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Export rate limiting
const exportLimiter = createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 export requests per 15 minutes
    message: "Too many export requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Update operations rate limiting
const updateLimiter = createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 update operations per 5 minutes
    message: "Too many update requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Delete operations rate limiting
const deleteLimiter = createLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 delete operations per 10 minutes
    message: "Too many delete requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

// Socket connection rate limiting (simple in-memory counter)
class SocketRateLimiter {
    constructor() {
        this.connections = new Map(); // userId -> { count, resetTime }
        this.messages = new Map(); // userId -> { count, resetTime }
    }

    // Check connection rate limit
    checkConnectionLimit(userId) {
        const now = Date.now();
        const windowMs = 5 * 60 * 1000; // 5 minutes
        const maxConnections = 10; // Max 10 connections per 5 minutes

        if (!this.connections.has(userId)) {
            this.connections.set(userId, {
                count: 1,
                resetTime: now + windowMs,
            });
            return true;
        }

        const userLimit = this.connections.get(userId);

        if (now > userLimit.resetTime) {
            // Reset the window
            this.connections.set(userId, {
                count: 1,
                resetTime: now + windowMs,
            });
            return true;
        }

        if (userLimit.count >= maxConnections) {
            return false;
        }

        userLimit.count++;
        return true;
    }

    // Check message rate limit
    checkMessageLimit(userId) {
        const now = Date.now();
        const windowMs = 1 * 60 * 1000; // 1 minute
        const maxMessages = 60; // Max 60 messages per minute

        if (!this.messages.has(userId)) {
            this.messages.set(userId, { count: 1, resetTime: now + windowMs });
            return true;
        }

        const userLimit = this.messages.get(userId);

        if (now > userLimit.resetTime) {
            // Reset the window
            this.messages.set(userId, { count: 1, resetTime: now + windowMs });
            return true;
        }

        if (userLimit.count >= maxMessages) {
            return false;
        }

        userLimit.count++;
        return true;
    }

    // Clean up old entries
    cleanup() {
        const now = Date.now();

        for (const [userId, limit] of this.connections.entries()) {
            if (now > limit.resetTime) {
                this.connections.delete(userId);
            }
        }

        for (const [userId, limit] of this.messages.entries()) {
            if (now > limit.resetTime) {
                this.messages.delete(userId);
            }
        }
    }
}

const socketRateLimiter = new SocketRateLimiter();

// Clean up every 5 minutes
setInterval(
    () => {
        socketRateLimiter.cleanup();
    },
    5 * 60 * 1000,
);

module.exports = {
    generalLimiter,
    createChatLimiter,
    sendMessageLimiter,
    getChatLimiter,
    getMessagesLimiter,
    exportLimiter,
    updateLimiter,
    deleteLimiter,
    socketRateLimiter,
};
