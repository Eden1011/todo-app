const convertTimeToMilliseconds = require("../../utils/time.utils.js")
const rateLimit = require("express-rate-limit");

const registerLimiter = rateLimit({
  windowMs: convertTimeToMilliseconds("15m"),
  max: 5,
  message: "Too many registration attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: convertTimeToMilliseconds("10min"),
  max: 10,
  message: "Too many login attempts, please try again later",
  skipSuccessfulRequests: true,
});

const emailLimiter = rateLimit({
  windowMs: convertTimeToMilliseconds("1m"),
  max: 3,
  message: "Too many email requests, please try again later",
});

module.exports = {
  registerLimiter,
  loginLimiter,
  emailLimiter
}
