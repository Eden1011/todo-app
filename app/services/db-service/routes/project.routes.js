const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

// Import rate limiters
const {
    generalLimiter,
    createResourceLimiter,
    updateLimiter,
    deleteLimiter,
} = require("../middleware/rate-limit");

// Import validations
const {
    createProjectValidation,
    updateProjectValidation,
    addMemberValidation,
    updateMemberRoleValidation,
    idParamValidation,
    paginationValidation,
    handleValidationErrors,
} = require("../middleware/validation");

const {
    createProject,
    getProjects,
    getProjectById,
    getProjectChatInfo,
    updateProject,
    deleteProject,
    addMember,
    updateMemberRole,
    removeMember,
} = require("../controllers/project/project.controller");

const router = express.Router();

router.post(
    "/",
    createResourceLimiter,
    createProjectValidation,
    handleValidationErrors,
    asyncHandler(createProject),
);

router.get(
    "/",
    generalLimiter,
    paginationValidation,
    handleValidationErrors,
    asyncHandler(getProjects),
);

router.get(
    "/:id",
    generalLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(getProjectById),
);

// Get project chat information
router.get(
    "/:id/chat",
    generalLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(getProjectChatInfo),
);

router.put(
    "/:id",
    updateLimiter,
    updateProjectValidation,
    handleValidationErrors,
    asyncHandler(updateProject),
);

router.delete(
    "/:id",
    deleteLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(deleteProject),
);

// Member management
router.post(
    "/:id/members",
    updateLimiter,
    addMemberValidation,
    handleValidationErrors,
    asyncHandler(addMember),
);

router.put(
    "/:id/members/:memberId/role",
    updateLimiter,
    updateMemberRoleValidation,
    handleValidationErrors,
    asyncHandler(updateMemberRole),
);

router.delete(
    "/:id/members/:memberId",
    deleteLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(removeMember),
);

module.exports = router;
