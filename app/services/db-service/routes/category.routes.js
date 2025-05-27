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
    createCategoryValidation,
    updateCategoryValidation,
    idParamValidation,
    paginationValidation,
    bulkDeleteValidation,
    handleValidationErrors,
} = require("../middleware/validation");

const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCategoryStats,
    bulkDeleteCategories,
} = require("../controllers/category/category.controller");

const router = express.Router();

// Basic category operations
router.post(
    "/",
    createResourceLimiter,
    createCategoryValidation,
    handleValidationErrors,
    asyncHandler(createCategory),
);

router.get(
    "/",
    generalLimiter,
    paginationValidation,
    handleValidationErrors,
    asyncHandler(getCategories),
);

router.get("/stats", statsLimiter, asyncHandler(getCategoryStats));

router.get(
    "/:id",
    generalLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(getCategoryById),
);

router.put(
    "/:id",
    updateLimiter,
    updateCategoryValidation,
    handleValidationErrors,
    asyncHandler(updateCategory),
);

router.delete(
    "/:id",
    deleteLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(deleteCategory),
);

// Bulk operations
router.delete(
    "/bulk",
    bulkOperationLimiter,
    bulkDeleteValidation,
    handleValidationErrors,
    asyncHandler(bulkDeleteCategories),
);

module.exports = router;
