const { body, query, param, validationResult } = require("express-validator");

// Chat validation schemas
const createChatValidation = [
    body("projectId")
        .isInt({ min: 1 })
        .withMessage("Project ID must be a positive integer"),
    body("name")
        .isLength({ min: 1, max: 100 })
        .withMessage("Chat name must be between 1 and 100 characters")
        .trim(),
    body("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must be less than 500 characters")
        .trim(),
];

const updateChatValidation = [
    param("id").isMongoId().withMessage("Invalid chat ID"),
    body("name")
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage("Chat name must be between 1 and 100 characters")
        .trim(),
    body("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must be less than 500 characters")
        .trim(),
];

// Message validation schemas
const sendMessageValidation = [
    body("content")
        .isLength({ min: 1, max: 2000 })
        .withMessage("Message content must be between 1 and 2000 characters")
        .trim(),
    body("messageType")
        .optional()
        .isIn(["text", "system", "file", "image"])
        .withMessage("Message type must be text, system, file, or image"),
    body("metadata")
        .optional()
        .isObject()
        .withMessage("Metadata must be an object"),
];

const updateMessageValidation = [
    param("messageId").isMongoId().withMessage("Invalid message ID"),
    body("content")
        .isLength({ min: 1, max: 2000 })
        .withMessage("Message content must be between 1 and 2000 characters")
        .trim(),
];

// Query validation schemas
const getChatMessagesValidation = [
    param("chatId").isMongoId().withMessage("Invalid chat ID"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    query("before")
        .optional()
        .isISO8601()
        .withMessage("Before must be a valid ISO8601 date"),
    query("after")
        .optional()
        .isISO8601()
        .withMessage("After must be a valid ISO8601 date"),
];

const getChatsValidation = [
    query("projectId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Project ID must be a positive integer"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50"),
    query("search")
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage("Search must be between 2 and 100 characters")
        .trim(),
];

// Common validations
const idParamValidation = [
    param("id").isMongoId().withMessage("Invalid ID format"),
];

const projectIdParamValidation = [
    param("projectId")
        .isInt({ min: 1 })
        .withMessage("Project ID must be a positive integer"),
];

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: "Validation failed",
            details: errors.array(),
        });
    }
    next();
}

/**
 * Validate socket message data
 */
function validateSocketMessage(data) {
    const errors = [];

    if (!data.content || typeof data.content !== "string") {
        errors.push("Content is required and must be a string");
    } else if (data.content.trim().length === 0) {
        errors.push("Content cannot be empty");
    } else if (data.content.length > 2000) {
        errors.push("Content cannot exceed 2000 characters");
    }

    if (
        data.messageType &&
        !["text", "system", "file", "image"].includes(data.messageType)
    ) {
        errors.push("Invalid message type");
    }

    if (data.metadata && typeof data.metadata !== "object") {
        errors.push("Metadata must be an object");
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
    };
}

/**
 * Validate chat room name
 */
function validateChatRoom(room) {
    // Room should be in format: project_<projectId>
    const projectRoomPattern = /^project_(\d+)$/;
    return projectRoomPattern.test(room);
}

module.exports = {
    createChatValidation,
    updateChatValidation,
    sendMessageValidation,
    updateMessageValidation,
    getChatMessagesValidation,
    getChatsValidation,
    idParamValidation,
    projectIdParamValidation,
    handleValidationErrors,
    validateSocketMessage,
    validateChatRoom,
};
