const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

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
router.post("/", asyncHandler(createTag));
router.get("/", asyncHandler(getTags));
router.get("/stats", asyncHandler(getTagStats));
router.get("/popular", asyncHandler(getPopularTags));
router.get("/:id", asyncHandler(getTagById));
router.put("/:id", asyncHandler(updateTag));
router.delete("/:id", asyncHandler(deleteTag));

// Bulk operations
router.delete("/bulk", asyncHandler(bulkDeleteTags));

module.exports = router;
