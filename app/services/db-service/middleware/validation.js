const { body, query, param, validationResult } = require("express-validator");

// Task validation schemas
const createTaskValidation = [
    body("title")
        .isLength({ min: 1, max: 200 })
        .withMessage("Title must be between 1 and 200 characters")
        .trim(),
    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be less than 1000 characters")
        .trim(),
    body("priority")
        .optional()
        .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .withMessage("Priority must be LOW, MEDIUM, HIGH, or URGENT"),
    body("status")
        .optional()
        .isIn(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"])
        .withMessage(
            "Status must be TODO, IN_PROGRESS, REVIEW, DONE, or CANCELED",
        ),
    body("dueDate")
        .optional()
        .isISO8601()
        .withMessage("Due date must be a valid ISO8601 date"),
    body("assigneeAuthId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Assignee auth ID must be a positive integer"),
    body("projectId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Project ID must be a positive integer"),
    body("categoryIds")
        .optional()
        .isArray()
        .withMessage("Category IDs must be an array"),
    body("categoryIds.*")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Each category ID must be a positive integer"),
    body("tagIds").optional().isArray().withMessage("Tag IDs must be an array"),
    body("tagIds.*")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Each tag ID must be a positive integer"),
];

const updateTaskValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Task ID must be a positive integer"),
    body("title")
        .optional()
        .isLength({ min: 1, max: 200 })
        .withMessage("Title must be between 1 and 200 characters")
        .trim(),
    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be less than 1000 characters")
        .trim(),
    body("priority")
        .optional()
        .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .withMessage("Priority must be LOW, MEDIUM, HIGH, or URGENT"),
    body("status")
        .optional()
        .isIn(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"])
        .withMessage(
            "Status must be TODO, IN_PROGRESS, REVIEW, DONE, or CANCELED",
        ),
    body("dueDate")
        .optional()
        .isISO8601()
        .withMessage("Due date must be a valid ISO8601 date"),
    body("assigneeAuthId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Assignee auth ID must be a positive integer"),
    body("projectId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Project ID must be a positive integer"),
];

const getTasksValidation = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    query("status")
        .optional()
        .isIn(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"])
        .withMessage(
            "Status must be TODO, IN_PROGRESS, REVIEW, DONE, or CANCELED",
        ),
    query("priority")
        .optional()
        .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .withMessage("Priority must be LOW, MEDIUM, HIGH, or URGENT"),
    query("projectId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Project ID must be a positive integer"),
    query("assignedToMe")
        .optional()
        .isBoolean()
        .withMessage("AssignedToMe must be a boolean"),
    query("search")
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage("Search must be between 2 and 100 characters")
        .trim(),
    query("sortBy")
        .optional()
        .isIn([
            "title",
            "status",
            "priority",
            "dueDate",
            "createdAt",
            "updatedAt",
        ])
        .withMessage(
            "SortBy must be title, status, priority, dueDate, createdAt, or updatedAt",
        ),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be asc or desc"),
];

const idParamValidation = [
    param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),
];

const taskIdParamValidation = [
    param("taskId")
        .isInt({ min: 1 })
        .withMessage("Task ID must be a positive integer"),
];

// Status validation schemas
const updateTaskStatusValidation = [
    ...taskIdParamValidation,
    body("status")
        .isIn(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"])
        .withMessage(
            "Status must be TODO, IN_PROGRESS, REVIEW, DONE, or CANCELED",
        ),
];

const bulkUpdateTaskStatusValidation = [
    body("taskIds")
        .isArray({ min: 1 })
        .withMessage("Task IDs must be a non-empty array"),
    body("taskIds.*")
        .isInt({ min: 1 })
        .withMessage("Each task ID must be a positive integer"),
    body("status")
        .isIn(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"])
        .withMessage(
            "Status must be TODO, IN_PROGRESS, REVIEW, DONE, or CANCELED",
        ),
];

// Priority validation schemas
const updateTaskPriorityValidation = [
    ...taskIdParamValidation,
    body("priority")
        .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .withMessage("Priority must be LOW, MEDIUM, HIGH, or URGENT"),
];

const bulkUpdateTaskPriorityValidation = [
    body("taskIds")
        .isArray({ min: 1 })
        .withMessage("Task IDs must be a non-empty array"),
    body("taskIds.*")
        .isInt({ min: 1 })
        .withMessage("Each task ID must be a positive integer"),
    body("priority")
        .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .withMessage("Priority must be LOW, MEDIUM, HIGH, or URGENT"),
];

// Due date validation schemas
const updateTaskDueDateValidation = [
    ...taskIdParamValidation,
    body("dueDate")
        .optional()
        .isISO8601()
        .withMessage("Due date must be a valid ISO8601 date"),
];

const bulkUpdateDueDatesValidation = [
    body("taskIds")
        .isArray({ min: 1 })
        .withMessage("Task IDs must be a non-empty array"),
    body("taskIds.*")
        .isInt({ min: 1 })
        .withMessage("Each task ID must be a positive integer"),
    body("operation")
        .isIn(["set", "extend", "clear"])
        .withMessage("Operation must be set, extend, or clear"),
    body("dueDate")
        .if(body("operation").equals("set"))
        .isISO8601()
        .withMessage(
            "Due date is required for set operation and must be valid ISO8601 date",
        ),
    body("dueDate")
        .if(body("operation").equals("extend"))
        .isInt({ min: 1 })
        .withMessage("Number of days is required for extend operation"),
];

// Category validation schemas
const createCategoryValidation = [
    body("name")
        .isLength({ min: 1, max: 100 })
        .withMessage("Name must be between 1 and 100 characters")
        .trim(),
    body("color")
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage("Color must be a valid hex color code"),
];

const updateCategoryValidation = [
    ...idParamValidation,
    body("name")
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage("Name must be between 1 and 100 characters")
        .trim(),
    body("color")
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage("Color must be a valid hex color code"),
];

const addCategoryToTaskValidation = [
    ...taskIdParamValidation,
    body("categoryId")
        .isInt({ min: 1 })
        .withMessage("Category ID must be a positive integer"),
];

const bulkAssignCategoriesToTaskValidation = [
    ...taskIdParamValidation,
    body("categoryIds")
        .isArray({ min: 1 })
        .withMessage("Category IDs must be a non-empty array"),
    body("categoryIds.*")
        .isInt({ min: 1 })
        .withMessage("Each category ID must be a positive integer"),
];

// Tag validation schemas
const createTagValidation = [
    body("name")
        .isLength({ min: 1, max: 50 })
        .withMessage("Name must be between 1 and 50 characters")
        .trim(),
    body("color")
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage("Color must be a valid hex color code"),
];

const updateTagValidation = [
    ...idParamValidation,
    body("name")
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage("Name must be between 1 and 50 characters")
        .trim(),
    body("color")
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage("Color must be a valid hex color code"),
];

const addTagToTaskValidation = [
    ...taskIdParamValidation,
    body("tagId")
        .isInt({ min: 1 })
        .withMessage("Tag ID must be a positive integer"),
];

const bulkAssignTagsToTaskValidation = [
    ...taskIdParamValidation,
    body("tagIds")
        .isArray({ min: 1 })
        .withMessage("Tag IDs must be a non-empty array"),
    body("tagIds.*")
        .isInt({ min: 1 })
        .withMessage("Each tag ID must be a positive integer"),
];

// Project validation schemas
const createProjectValidation = [
    body("name")
        .isLength({ min: 1, max: 200 })
        .withMessage("Name must be between 1 and 200 characters")
        .trim(),
    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be less than 1000 characters")
        .trim(),
];

const updateProjectValidation = [
    ...idParamValidation,
    body("name")
        .optional()
        .isLength({ min: 1, max: 200 })
        .withMessage("Name must be between 1 and 200 characters")
        .trim(),
    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be less than 1000 characters")
        .trim(),
];

const addMemberValidation = [
    ...idParamValidation,
    body("memberAuthId")
        .isInt({ min: 1 })
        .withMessage("Member auth ID must be a positive integer"),
    body("role")
        .optional()
        .isIn(["OWNER", "ADMIN", "MEMBER", "VIEWER"])
        .withMessage("Role must be OWNER, ADMIN, MEMBER, or VIEWER"),
];

const updateMemberRoleValidation = [
    ...idParamValidation,
    param("memberId")
        .isInt({ min: 1 })
        .withMessage("Member ID must be a positive integer"),
    body("role")
        .isIn(["OWNER", "ADMIN", "MEMBER", "VIEWER"])
        .withMessage("Role must be OWNER, ADMIN, MEMBER, or VIEWER"),
];

// Common pagination validation
const paginationValidation = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
];

// Bulk delete validation
const bulkDeleteValidation = [
    body("ids")
        .isArray({ min: 1 })
        .withMessage("IDs must be a non-empty array"),
    body("ids.*")
        .isInt({ min: 1 })
        .withMessage("Each ID must be a positive integer"),
];

// Export validation
const exportValidation = [
    query("format")
        .optional()
        .isIn(["csv", "json", "ical"])
        .withMessage("Format must be csv, json, or ical"),
    query("includeArchived")
        .optional()
        .isBoolean()
        .withMessage("Include archived must be a boolean"),
    query("detailed")
        .optional()
        .isBoolean()
        .withMessage("Detailed must be a boolean"),
];

function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: "Validation failed",
            details: errors.array(),
        });
    }
    next();
}

module.exports = {
    // Task validations
    createTaskValidation,
    updateTaskValidation,
    getTasksValidation,
    idParamValidation,
    taskIdParamValidation,

    // Status validations
    updateTaskStatusValidation,
    bulkUpdateTaskStatusValidation,

    // Priority validations
    updateTaskPriorityValidation,
    bulkUpdateTaskPriorityValidation,

    // Due date validations
    updateTaskDueDateValidation,
    bulkUpdateDueDatesValidation,

    // Category validations
    createCategoryValidation,
    updateCategoryValidation,
    addCategoryToTaskValidation,
    bulkAssignCategoriesToTaskValidation,

    // Tag validations
    createTagValidation,
    updateTagValidation,
    addTagToTaskValidation,
    bulkAssignTagsToTaskValidation,

    // Project validations
    createProjectValidation,
    updateProjectValidation,
    addMemberValidation,
    updateMemberRoleValidation,

    // Common validations
    paginationValidation,
    bulkDeleteValidation,
    exportValidation,
    handleValidationErrors,
};
