const { body, query, param, validationResult } = require("express-validator");

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

const updateTaskStatusValidation = [
    ...taskIdParamValidation,
    body("status")
        .isIn(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"])
        .withMessage(
            "Status must be TODO, IN_PROGRESS, REVIEW, DONE, or CANCELED",
        ),
];

const updateTaskPriorityValidation = [
    ...taskIdParamValidation,
    body("priority")
        .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .withMessage("Priority must be LOW, MEDIUM, HIGH, or URGENT"),
];

const updateTaskDueDateValidation = [
    ...taskIdParamValidation,
    body("dueDate")
        .optional()
        .isISO8601()
        .withMessage("Due date must be a valid ISO8601 date"),
];

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

const exportValidation = [
    query("format")
        .optional()
        .isIn(["csv", "json"])
        .withMessage("Format must be csv or json"),
    query("includeArchived")
        .optional()
        .isBoolean()
        .withMessage("Include archived must be a boolean"),
    query("detailed")
        .optional()
        .isBoolean()
        .withMessage("Detailed must be a boolean"),
];

const searchUserValidation = [
    query("query")
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage("Query must be between 2 and 50 characters")
        .trim(),
    query("id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("ID must be a positive integer"),
    query("authId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Auth ID must be a positive integer"),
    query().custom((value, { req }) => {
        const { query, id, authId } = req.query;
        if (!query && !id && !authId) {
            throw new Error(
                "At least one search parameter (query, id, or authId) is required",
            );
        }
        return true;
    }),
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
    createTaskValidation,
    updateTaskValidation,
    getTasksValidation,
    idParamValidation,
    taskIdParamValidation,
    updateTaskStatusValidation,
    updateTaskPriorityValidation,
    updateTaskDueDateValidation,
    createCategoryValidation,
    updateCategoryValidation,
    addCategoryToTaskValidation,
    createTagValidation,
    updateTagValidation,
    addTagToTaskValidation,
    createProjectValidation,
    updateProjectValidation,
    addMemberValidation,
    updateMemberRoleValidation,
    searchUserValidation,
    paginationValidation,
    exportValidation,
    handleValidationErrors,
};
