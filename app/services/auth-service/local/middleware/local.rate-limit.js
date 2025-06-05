const convertTimeToMilliseconds = require("../../utils/time.utils.js");
const rateLimit = require("express-rate-limit");

const isDevelopment =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
const disableRateLimitEnv = process.env.DISABLE_RATE_LIMIT === "true";

const createLimiter = (options) => {
    if (isDevelopment || disableRateLimitEnv) {
        return (req, res, next) => next(); // Pass-through middleware
    }
    return rateLimit(options);
};

const registerLimiter = createLimiter({
    windowMs: convertTimeToMilliseconds("15m"),
    max: 5,
    message: "Too many registration attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = createLimiter({
    windowMs: convertTimeToMilliseconds("10min"),
    max: 10,
    message: "Too many login attempts, please try again later",
    skipSuccessfulRequests: true,
});

const emailLimiter = createLimiter({
    windowMs: convertTimeToMilliseconds("1m"),
    max: 3,
    message: "Too many email requests, please try again later",
});

module.exports = {
    registerLimiter,
    loginLimiter,
    emailLimiter,
};
