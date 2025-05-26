const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

// Import controllers
const {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask,
} = require("../controllers/task/task.general.controller");

const {
    updateTaskStatus,
    getTaskStatusHistory,
    bulkUpdateTaskStatus,
    getTasksByStatus,
    getStatusStatistics,
} = require("../controllers/task/task.status.controller");

const {
    updateTaskPriority,
    bulkUpdateTaskPriority,
    getTasksByPriority,
    getPriorityStatistics,
    getHighPriorityOverdueTasks,
    autoPrioritizeTasks,
} = require("../controllers/task/task.priority.controller");

const {
    updateTaskDueDate,
    getTasksDueSoon,
    getOverdueTasks,
    getTasksDueToday,
    sendDueDateReminders,
    bulkUpdateDueDates,
    getDueDateStatistics,
} = require("../controllers/task/task.due-date.controller");

const {
    addCategoryToTask,
    removeCategoryFromTask,
    getTaskCategories,
    getCategoryTasks,
    bulkAssignCategoriesToTask,
    bulkAssignTasksToCategory,
} = require("../controllers/task/task.category.controller");

const {
    addTagToTask,
    removeTagFromTask,
    getTaskTags,
    getTagTasks,
    bulkAssignTagsToTask,
    bulkAssignTasksToTag,
    getPopularTagCombinations,
} = require("../controllers/task/task.tag.controller");

const router = express.Router();

// Basic task operations
router.post("/", asyncHandler(createTask));
router.get("/", asyncHandler(getTasks));
router.get("/:id", asyncHandler(getTaskById));
router.put("/:id", asyncHandler(updateTask));
router.delete("/:id", asyncHandler(deleteTask));
router.post("/:id/assign", asyncHandler(assignTask));

// Status operations
router.put("/:taskId/status", asyncHandler(updateTaskStatus));
router.get("/:taskId/status/history", asyncHandler(getTaskStatusHistory));
router.post("/bulk/status", asyncHandler(bulkUpdateTaskStatus));
router.get("/status/:status", asyncHandler(getTasksByStatus));
router.get("/statistics/status", asyncHandler(getStatusStatistics));

// Priority operations
router.put("/:taskId/priority", asyncHandler(updateTaskPriority));
router.post("/bulk/priority", asyncHandler(bulkUpdateTaskPriority));
router.get("/priority/:priority", asyncHandler(getTasksByPriority));
router.get("/statistics/priority", asyncHandler(getPriorityStatistics));
router.get("/priority/high/overdue", asyncHandler(getHighPriorityOverdueTasks));
router.post("/auto-prioritize", asyncHandler(autoPrioritizeTasks));

// Due date operations
router.put("/:taskId/due-date", asyncHandler(updateTaskDueDate));
router.get("/due/soon", asyncHandler(getTasksDueSoon));
router.get("/due/overdue", asyncHandler(getOverdueTasks));
router.get("/due/today", asyncHandler(getTasksDueToday));
router.post("/due/reminders", asyncHandler(sendDueDateReminders));
router.post("/bulk/due-dates", asyncHandler(bulkUpdateDueDates));
router.get("/statistics/due-dates", asyncHandler(getDueDateStatistics));

// Category operations
router.post("/:taskId/categories", asyncHandler(addCategoryToTask));
router.delete(
    "/:taskId/categories/:categoryId",
    asyncHandler(removeCategoryFromTask),
);
router.get("/:taskId/categories", asyncHandler(getTaskCategories));
router.get("/categories/:categoryId/tasks", asyncHandler(getCategoryTasks));
router.post(
    "/:taskId/categories/bulk",
    asyncHandler(bulkAssignCategoriesToTask),
);
router.post(
    "/categories/:categoryId/tasks/bulk",
    asyncHandler(bulkAssignTasksToCategory),
);

// Tag operations
router.post("/:taskId/tags", asyncHandler(addTagToTask));
router.delete("/:taskId/tags/:tagId", asyncHandler(removeTagFromTask));
router.get("/:taskId/tags", asyncHandler(getTaskTags));
router.get("/tags/:tagId/tasks", asyncHandler(getTagTasks));
router.post("/:taskId/tags/bulk", asyncHandler(bulkAssignTagsToTask));
router.post("/tags/:tagId/tasks/bulk", asyncHandler(bulkAssignTasksToTag));
router.get(
    "/tags/combinations/popular",
    asyncHandler(getPopularTagCombinations),
);

module.exports = router;
