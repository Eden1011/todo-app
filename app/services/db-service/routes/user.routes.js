const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

const {
    generalLimiter,
    searchLimiter,
    deleteLimiter,
} = require("../middleware/rate-limit");

const {
    paginationValidation,
    searchUserValidation,
    handleValidationErrors,
} = require("../middleware/validation");

const {
    getUserProfile,
    getUserActivity,
    searchUsers,
    deleteUser,
} = require("../controllers/user/user.controller");

const router = express.Router();

// User operations
router.get("/profile", generalLimiter, asyncHandler(getUserProfile));

router.get(
    "/activity",
    generalLimiter,
    paginationValidation,
    handleValidationErrors,
    asyncHandler(getUserActivity),
);

router.get(
    "/search",
    searchLimiter,
    searchUserValidation,
    handleValidationErrors,
    asyncHandler(searchUsers),
);

router.delete("/", deleteLimiter, asyncHandler(deleteUser));

module.exports = router;
