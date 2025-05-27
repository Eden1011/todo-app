const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

// Import rate limiters
const {
    generalLimiter,
    notificationLimiter,
    updateLimiter,
    deleteLimiter,
    statsLimiter,
} = require("../middleware/rate-limit");

// Import validations
const {
    idParamValidation,
    paginationValidation,
    handleValidationErrors,
} = require("../middleware/validation");

const {
    getNotifications,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getNotificationStats,
} = require("../controllers/notification/notification.controller");

const router = express.Router();

// Basic notification operations
router.get(
    "/",
    generalLimiter,
    paginationValidation,
    handleValidationErrors,
    asyncHandler(getNotifications),
);

router.get("/stats", statsLimiter, asyncHandler(getNotificationStats));

router.get(
    "/:id",
    generalLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(getNotificationById),
);

// Mark as read operations
router.put(
    "/:id/read",
    notificationLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(markAsRead),
);

router.put("/read/all", notificationLimiter, asyncHandler(markAllAsRead));

// Delete operations
router.delete(
    "/:id",
    deleteLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(deleteNotification),
);

router.delete("/read/all", deleteLimiter, asyncHandler(deleteAllRead));

module.exports = router;
