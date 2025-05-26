const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    updateMemberRole,
    removeMember,
} = require("../controllers/project/project.controller");

const router = express.Router();

// Basic project operations
router.post("/", asyncHandler(createProject));
router.get("/", asyncHandler(getProjects));
router.get("/:id", asyncHandler(getProjectById));
router.put("/:id", asyncHandler(updateProject));
router.delete("/:id", asyncHandler(deleteProject));

// Member management
router.post("/:id/members", asyncHandler(addMember));
router.put("/:id/members/:memberId/role", asyncHandler(updateMemberRole));
router.delete("/:id/members/:memberId", asyncHandler(removeMember));

module.exports = router;
