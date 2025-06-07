const express = require("express");
const { asyncHandler } = require("../middleware/error.handler");

const {
    generalLimiter,
    createTaskLimiter,
    updateLimiter,
    deleteLimiter,
    statsLimiter,
} = require("../middleware/rate-limit");

const {
    createTaskValidation,
    updateTaskValidation,
    getTasksValidation,
    idParamValidation,
    taskIdParamValidation,
    updateTaskStatusValidation,
    updateTaskPriorityValidation,
    updateTaskDueDateValidation,
    addCategoryToTaskValidation,
    addTagToTaskValidation,
    handleValidationErrors,
} = require("../middleware/validation");

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
    getTasksByStatus,
    getStatusStatistics,
} = require("../controllers/task/task.status.controller");

const {
    updateTaskPriority,
    getTasksByPriority,
    getPriorityStatistics,
    getHighPriorityOverdueTasks,
} = require("../controllers/task/task.priority.controller");

const {
    updateTaskDueDate,
    getTasksDueSoon,
    getOverdueTasks,
    getTasksDueToday,
    sendDueDateReminders,
    getDueDateStatistics,
} = require("../controllers/task/task.due-date.controller");

const {
    addCategoryToTask,
    removeCategoryFromTask,
    getTaskCategories,
    getCategoryTasks,
} = require("../controllers/task/task.category.controller");

const {
    addTagToTask,
    removeTagFromTask,
    getTaskTags,
    getTagTasks,
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

router.get(
    "/tags/combinations/popular",
    statsLimiter,
    asyncHandler(getPopularTagCombinations),
);

module.exports = router;
