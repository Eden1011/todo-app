const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

const { generalLimiter, exportLimiter } = require("../middleware/rate-limit");

const {
    exportValidation,
    handleValidationErrors,
} = require("../middleware/validation");

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
router.get("/info", generalLimiter, asyncHandler(getExportInfo));

// Task exports
router.get(
    "/tasks/csv",
    exportLimiter,
    exportValidation,
    handleValidationErrors,
    asyncHandler(exportTasksToCSV),
);

router.get(
    "/tasks/json",
    exportLimiter,
    exportValidation,
    handleValidationErrors,
    asyncHandler(exportTasksToJSON),
);

router.get(
    "/tasks/ical",
    exportLimiter,
    exportValidation,
    handleValidationErrors,
    asyncHandler(exportTasksToICal),
);

// Project exports
router.get(
    "/projects/csv",
    exportLimiter,
    exportValidation,
    handleValidationErrors,
    asyncHandler(exportProjectsToCSV),
);

router.get(
    "/projects/json",
    exportLimiter,
    exportValidation,
    handleValidationErrors,
    asyncHandler(exportProjectsToJSON),
);

// Full data backup
router.get("/backup", exportLimiter, asyncHandler(exportUserDataBackup));

module.exports = router;
