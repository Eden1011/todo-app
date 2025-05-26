const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

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
router.get("/", asyncHandler(getNotifications));
router.get("/stats", asyncHandler(getNotificationStats));
router.get("/:id", asyncHandler(getNotificationById));

// Mark as read operations
router.put("/:id/read", asyncHandler(markAsRead));
router.put("/read/all", asyncHandler(markAllAsRead));

// Delete operations
router.delete("/:id", asyncHandler(deleteNotification));
router.delete("/read/all", asyncHandler(deleteAllRead));

module.exports = router;
