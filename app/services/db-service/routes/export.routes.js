const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

const {
    exportTasksToCSV,
    exportTasksToJSON,
    exportProjectsToCSV,
    exportProjectsToJSON,
    exportTasksToICal,
    getExportInfo,
    exportUserDataBackup,
} = require("../controllers/export/export.controller");

const router = express.Router();

// Export info
router.get("/info", asyncHandler(getExportInfo));

// Task exports
router.get("/tasks/csv", asyncHandler(exportTasksToCSV));
router.get("/tasks/json", asyncHandler(exportTasksToJSON));
router.get("/tasks/ical", asyncHandler(exportTasksToICal));

// Project exports
router.get("/projects/csv", asyncHandler(exportProjectsToCSV));
router.get("/projects/json", asyncHandler(exportProjectsToJSON));

// Full data backup
router.get("/backup", asyncHandler(exportUserDataBackup));

module.exports = router;
