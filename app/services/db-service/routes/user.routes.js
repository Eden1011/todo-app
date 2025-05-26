const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

const {
    getUserProfile,
    getUserActivity,
    searchUsers,
    deleteUser,
} = require("../controllers/user/user.controller");

const router = express.Router();

// User operations
router.get("/profile", asyncHandler(getUserProfile));
router.get("/activity", asyncHandler(getUserActivity));
router.get("/search", asyncHandler(searchUsers));
router.delete("/", asyncHandler(deleteUser));

module.exports = router;
