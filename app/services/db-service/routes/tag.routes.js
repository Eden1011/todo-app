const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

// Import rate limiters
const {
    generalLimiter,
    createResourceLimiter,
    updateLimiter,
    deleteLimiter,
    statsLimiter,
    bulkOperationLimiter,
} = require("../middleware/rate-limit");

// Import validations
const {
    createTagValidation,
    updateTagValidation,
    idParamValidation,
    paginationValidation,
    bulkDeleteTagsValidation,
    handleValidationErrors,
} = require("../middleware/validation");

const {
    createTag,
    getTags,
    getTagById,
    updateTag,
    deleteTag,
    getTagStats,
    bulkDeleteTags,
    getPopularTags,
} = require("../controllers/tag/tag.controller");

const router = express.Router();

// Basic tag operations
router.post(
    "/",
    createResourceLimiter,
    createTagValidation,
    handleValidationErrors,
    asyncHandler(createTag),
);

router.get(
    "/",
    generalLimiter,
    paginationValidation,
    handleValidationErrors,
    asyncHandler(getTags),
);

// Specific routes MUST come BEFORE parameter routes
router.get("/stats", statsLimiter, asyncHandler(getTagStats));

router.get("/popular", generalLimiter, asyncHandler(getPopularTags));

// IMPORTANT: Bulk operations MUST come BEFORE /:id routes
// This fixes the route matching issue where /bulk was matched by /:id
router.delete(
    "/bulk",
    bulkOperationLimiter,
    bulkDeleteTagsValidation,
    handleValidationErrors,
    asyncHandler(bulkDeleteTags),
);

// Parameter routes come AFTER specific routes
router.get(
    "/:id",
    generalLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(getTagById),
);

router.put(
    "/:id",
    updateLimiter,
    updateTagValidation,
    handleValidationErrors,
    asyncHandler(updateTag),
);

router.delete(
    "/:id",
    deleteLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(deleteTag),
);

module.exports = router;
