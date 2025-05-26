const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

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
router.post("/", asyncHandler(createCategory));
router.get("/", asyncHandler(getCategories));
router.get("/stats", asyncHandler(getCategoryStats));
router.get("/:id", asyncHandler(getCategoryById));
router.put("/:id", asyncHandler(updateCategory));
router.delete("/:id", asyncHandler(deleteCategory));

// Bulk operations
router.delete("/bulk", asyncHandler(bulkDeleteCategories));

module.exports = router;
