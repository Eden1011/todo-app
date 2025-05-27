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
    bulkDeleteValidation,
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

router.get("/stats", statsLimiter, asyncHandler(getTagStats));

router.get("/popular", generalLimiter, asyncHandler(getPopularTags));

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

// Bulk operations
router.delete(
    "/bulk",
    bulkOperationLimiter,
    bulkDeleteValidation,
    handleValidationErrors,
    asyncHandler(bulkDeleteTags),
);

module.exports = router;
