const express = require("express");
const { asyncHandler } = require("../middleware/error-handler.middleware");

// Import rate limiters
const {
    getMessagesLimiter,
    sendMessageLimiter,
    updateLimiter,
    deleteLimiter,
    generalLimiter,
    exportLimiter,
} = require("../middleware/rate-limit.middleware");

// Import validations
const {
    getChatMessagesValidation,
    sendMessageValidation,
    updateMessageValidation,
    handleValidationErrors,
} = require("../middleware/validation.middleware");

// Import controllers
const {
    getChatMessages,
    exportChatMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    getMessageById,
    searchMessages,
} = require("../controllers/message.controller");

const router = express.Router();

// Get messages for a specific chat (enhanced for frontend integration)
router.get(
    "/chat/:chatId",
    getMessagesLimiter,
    getChatMessagesValidation,
    handleValidationErrors,
    asyncHandler(getChatMessages),
);

// Export all messages from a chat (for data export/backup)
router.get(
    "/chat/:chatId/export",
    exportLimiter,
    handleValidationErrors,
    asyncHandler(exportChatMessages),
);

// Search messages in a chat
router.get(
    "/chat/:chatId/search",
    generalLimiter,
    handleValidationErrors,
    asyncHandler(searchMessages),
);

// Send a message to a chat (API endpoint - mainly for testing)
router.post(
    "/chat/:chatId",
    sendMessageLimiter,
    sendMessageValidation,
    handleValidationErrors,
    asyncHandler(sendMessage),
);

// Get specific message by ID
router.get(
    "/:messageId",
    generalLimiter,
    handleValidationErrors,
    asyncHandler(getMessageById),
);

// Update a message
router.put(
    "/:messageId",
    updateLimiter,
    updateMessageValidation,
    handleValidationErrors,
    asyncHandler(updateMessage),
);

// Delete a message
router.delete(
    "/:messageId",
    deleteLimiter,
    handleValidationErrors,
    asyncHandler(deleteMessage),
);

module.exports = router;
