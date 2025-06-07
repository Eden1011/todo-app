const express = require("express");
const { asyncHandler } = require("../middleware/error-handler.middleware");

// Import rate limiters
const {
    generalLimiter,
    createChatLimiter,
    getChatLimiter,
    updateLimiter,
    deleteLimiter,
} = require("../middleware/rate-limit.middleware");

// Import validations
const {
    createChatValidation,
    updateChatValidation,
    getChatsValidation,
    idParamValidation,
    projectIdParamValidation,
    handleValidationErrors,
} = require("../middleware/validation.middleware");

// Import controllers
const {
    createChat,
    autoCreateProjectChat,
    getProjectChats,
    getOrCreateProjectChat,
    getChats,
    getChatById,
    updateChat,
    deleteChat,
    getChatStats,
} = require("../controllers/chat.controller");

const router = express.Router();

// Create a new chat
router.post(
    "/",
    createChatLimiter,
    createChatValidation,
    handleValidationErrors,
    asyncHandler(createChat),
);

// Get chats (with optional filtering)
router.get(
    "/",
    getChatLimiter,
    getChatsValidation,
    handleValidationErrors,
    asyncHandler(getChats),
);

// Get chat statistics
router.get("/stats", generalLimiter, asyncHandler(getChatStats));

// Get chats for a specific project
router.get(
    "/project/:projectId",
    getChatLimiter,
    projectIdParamValidation,
    handleValidationErrors,
    asyncHandler(getProjectChats),
);

// Get or create default chat for a project (useful for frontend)
router.get(
    "/project/:projectId/default",
    getChatLimiter,
    projectIdParamValidation,
    handleValidationErrors,
    asyncHandler(getOrCreateProjectChat),
);

// Get specific chat by ID
router.get(
    "/:id",
    getChatLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(getChatById),
);

// Update chat
router.put(
    "/:id",
    updateLimiter,
    updateChatValidation,
    handleValidationErrors,
    asyncHandler(updateChat),
);

// Delete/deactivate chat
router.delete(
    "/:id",
    deleteLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(deleteChat),
);

module.exports = router;
