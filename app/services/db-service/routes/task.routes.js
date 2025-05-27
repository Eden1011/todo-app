const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

// Import rate limiters
const {
    generalLimiter,
    createTaskLimiter,
    bulkOperationLimiter,
    updateLimiter,
    deleteLimiter,
    statsLimiter,
    heavyOperationLimiter,
} = require("../middleware/rate-limit");

// Import validations
const {
    createTaskValidation,
    updateTaskValidation,
    getTasksValidation,
    idParamValidation,
    taskIdParamValidation,
    updateTaskStatusValidation,
    bulkUpdateTaskStatusValidation,
    updateTaskPriorityValidation,
    bulkUpdateTaskPriorityValidation,
    updateTaskDueDateValidation,
    bulkUpdateDueDatesValidation,
    addCategoryToTaskValidation,
    bulkAssignCategoriesToTaskValidation,
    addTagToTaskValidation,
    bulkAssignTagsToTaskValidation,
    handleValidationErrors,
} = require("../middleware/validation");

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
router.post(
    "/",
    createTaskLimiter,
    createTaskValidation,
    handleValidationErrors,
    asyncHandler(createTask),
);

router.get(
    "/",
    generalLimiter,
    getTasksValidation,
    handleValidationErrors,
    asyncHandler(getTasks),
);

router.get(
    "/:id",
    generalLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(getTaskById),
);

router.put(
    "/:id",
    updateLimiter,
    updateTaskValidation,
    handleValidationErrors,
    asyncHandler(updateTask),
);

router.delete(
    "/:id",
    deleteLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(deleteTask),
);

router.post(
    "/:id/assign",
    updateLimiter,
    idParamValidation,
    handleValidationErrors,
    asyncHandler(assignTask),
);

// Status operations
router.put(
    "/:taskId/status",
    updateLimiter,
    updateTaskStatusValidation,
    handleValidationErrors,
    asyncHandler(updateTaskStatus),
);

router.get(
    "/:taskId/status/history",
    generalLimiter,
    taskIdParamValidation,
    handleValidationErrors,
    asyncHandler(getTaskStatusHistory),
);

router.post(
    "/bulk/status",
    bulkOperationLimiter,
    bulkUpdateTaskStatusValidation,
    handleValidationErrors,
    asyncHandler(bulkUpdateTaskStatus),
);

router.get("/status/:status", generalLimiter, asyncHandler(getTasksByStatus));

router.get(
    "/statistics/status",
    statsLimiter,
    asyncHandler(getStatusStatistics),
);

// Priority operations
router.put(
    "/:taskId/priority",
    updateLimiter,
    updateTaskPriorityValidation,
    handleValidationErrors,
    asyncHandler(updateTaskPriority),
);

router.post(
    "/bulk/priority",
    bulkOperationLimiter,
    bulkUpdateTaskPriorityValidation,
    handleValidationErrors,
    asyncHandler(bulkUpdateTaskPriority),
);

router.get(
    "/priority/:priority",
    generalLimiter,
    asyncHandler(getTasksByPriority),
);

router.get(
    "/statistics/priority",
    statsLimiter,
    asyncHandler(getPriorityStatistics),
);

router.get(
    "/priority/high/overdue",
    generalLimiter,
    asyncHandler(getHighPriorityOverdueTasks),
);

router.post(
    "/auto-prioritize",
    heavyOperationLimiter,
    asyncHandler(autoPrioritizeTasks),
);

// Due date operations
router.put(
    "/:taskId/due-date",
    updateLimiter,
    updateTaskDueDateValidation,
    handleValidationErrors,
    asyncHandler(updateTaskDueDate),
);

router.get("/due/soon", generalLimiter, asyncHandler(getTasksDueSoon));

router.get("/due/overdue", generalLimiter, asyncHandler(getOverdueTasks));

router.get("/due/today", generalLimiter, asyncHandler(getTasksDueToday));

router.post(
    "/due/reminders",
    generalLimiter,
    asyncHandler(sendDueDateReminders),
);

router.post(
    "/bulk/due-dates",
    bulkOperationLimiter,
    bulkUpdateDueDatesValidation,
    handleValidationErrors,
    asyncHandler(bulkUpdateDueDates),
);

router.get(
    "/statistics/due-dates",
    statsLimiter,
    asyncHandler(getDueDateStatistics),
);

// Category operations
router.post(
    "/:taskId/categories",
    updateLimiter,
    addCategoryToTaskValidation,
    handleValidationErrors,
    asyncHandler(addCategoryToTask),
);

router.delete(
    "/:taskId/categories/:categoryId",
    deleteLimiter,
    taskIdParamValidation,
    handleValidationErrors,
    asyncHandler(removeCategoryFromTask),
);

router.get(
    "/:taskId/categories",
    generalLimiter,
    taskIdParamValidation,
    handleValidationErrors,
    asyncHandler(getTaskCategories),
);

router.get(
    "/categories/:categoryId/tasks",
    generalLimiter,
    asyncHandler(getCategoryTasks),
);

router.post(
    "/:taskId/categories/bulk",
    bulkOperationLimiter,
    bulkAssignCategoriesToTaskValidation,
    handleValidationErrors,
    asyncHandler(bulkAssignCategoriesToTask),
);

router.post(
    "/categories/:categoryId/tasks/bulk",
    bulkOperationLimiter,
    asyncHandler(bulkAssignTasksToCategory),
);

// Tag operations
router.post(
    "/:taskId/tags",
    updateLimiter,
    addTagToTaskValidation,
    handleValidationErrors,
    asyncHandler(addTagToTask),
);

router.delete(
    "/:taskId/tags/:tagId",
    deleteLimiter,
    taskIdParamValidation,
    handleValidationErrors,
    asyncHandler(removeTagFromTask),
);

router.get(
    "/:taskId/tags",
    generalLimiter,
    taskIdParamValidation,
    handleValidationErrors,
    asyncHandler(getTaskTags),
);

router.get("/tags/:tagId/tasks", generalLimiter, asyncHandler(getTagTasks));

router.post(
    "/:taskId/tags/bulk",
    bulkOperationLimiter,
    bulkAssignTagsToTaskValidation,
    handleValidationErrors,
    asyncHandler(bulkAssignTagsToTask),
);

router.post(
    "/tags/:tagId/tasks/bulk",
    bulkOperationLimiter,
    asyncHandler(bulkAssignTasksToTag),
);

router.get(
    "/tags/combinations/popular",
    statsLimiter,
    asyncHandler(getPopularTagCombinations),
);

module.exports = router;
