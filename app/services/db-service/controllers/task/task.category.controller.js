const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

/**
 * Add category to task
 */
async function addCategoryToTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                error: "Category ID is required",
            });
        }

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Check if user owns the category
        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
                ownerId: user.id,
            },
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found or you don't own it",
            });
        }

        // Check if category is already assigned to task
        const existingAssignment = await prisma.categoryOnTask.findUnique({
            where: {
                categoryId_taskId: {
                    categoryId: categoryId,
                    taskId: taskId,
                },
            },
        });

        if (existingAssignment) {
            return res.status(409).json({
                success: false,
                error: "Category is already assigned to this task",
            });
        }

        // Add category to task
        const categoryOnTask = await prisma.categoryOnTask.create({
            data: {
                categoryId: categoryId,
                taskId: taskId,
            },
            include: {
                category: {
                    select: { id: true, name: true, color: true },
                },
                task: {
                    select: { id: true, title: true },
                },
            },
        });

        res.status(201).json({
            success: true,
            data: categoryOnTask,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Remove category from task
 */
async function removeCategoryFromTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const categoryId = parseInt(req.params.categoryId);

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Check if category assignment exists
        const categoryOnTask = await prisma.categoryOnTask.findUnique({
            where: {
                categoryId_taskId: {
                    categoryId: categoryId,
                    taskId: taskId,
                },
            },
            include: {
                category: {
                    select: { ownerId: true },
                },
            },
        });

        if (!categoryOnTask) {
            return res.status(404).json({
                success: false,
                error: "Category is not assigned to this task",
            });
        }

        // Check if user owns the category
        if (categoryOnTask.category.ownerId !== user.id) {
            return res.status(403).json({
                success: false,
                error: "You don't own this category",
            });
        }

        // Remove category from task
        await prisma.categoryOnTask.delete({
            where: {
                categoryId_taskId: {
                    categoryId: categoryId,
                    taskId: taskId,
                },
            },
        });

        res.json({
            success: true,
            data: {
                message: "Category removed from task successfully",
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get all categories for a task
 */
async function getTaskCategories(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        const categories = await prisma.categoryOnTask.findMany({
            where: {
                taskId: taskId,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        ownerId: true,
                    },
                },
            },
            orderBy: {
                assignedAt: "asc",
            },
        });

        res.json({
            success: true,
            data: {
                taskId,
                categories: categories.map((c) => ({
                    ...c.category,
                    assignedAt: c.assignedAt,
                })),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get all tasks for a category
 */
async function getCategoryTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const categoryId = parseInt(req.params.categoryId);

        const { page = 1, limit = 20, status, priority } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Check if user owns the category
        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
                ownerId: user.id,
            },
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found or you don't own it",
            });
        }

        // Build where clause for tasks
        const taskWhere = {};
        if (status) taskWhere.status = status;
        if (priority) taskWhere.priority = priority;

        const [categoryTasks, total] = await Promise.all([
            prisma.categoryOnTask.findMany({
                where: {
                    categoryId: categoryId,
                    task: taskWhere,
                },
                skip,
                take,
                include: {
                    task: {
                        include: {
                            owner: { select: { id: true, authId: true } },
                            assignee: { select: { id: true, authId: true } },
                            project: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: {
                    assignedAt: "desc",
                },
            }),
            prisma.categoryOnTask.count({
                where: {
                    categoryId: categoryId,
                    task: taskWhere,
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                category: {
                    id: category.id,
                    name: category.name,
                    color: category.color,
                },
                tasks: categoryTasks.map((ct) => ({
                    ...ct.task,
                    assignedAt: ct.assignedAt,
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Bulk assign categories to task
 */
async function bulkAssignCategoriesToTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { categoryIds } = req.body;

        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Category IDs array is required",
            });
        }

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Check if user owns all categories
        const categories = await prisma.category.findMany({
            where: {
                id: { in: categoryIds },
                ownerId: user.id,
            },
        });

        if (categories.length !== categoryIds.length) {
            return res.status(404).json({
                success: false,
                error: "Some categories not found or you don't own them",
            });
        }

        // Remove existing categories first
        await prisma.categoryOnTask.deleteMany({
            where: {
                taskId: taskId,
                category: {
                    ownerId: user.id,
                },
            },
        });

        // Add new categories
        const categoryAssignments = categoryIds.map((categoryId) => ({
            categoryId,
            taskId,
        }));

        await prisma.categoryOnTask.createMany({
            data: categoryAssignments,
        });

        // Get updated task with categories
        const updatedTaskCategories = await prisma.categoryOnTask.findMany({
            where: {
                taskId: taskId,
            },
            include: {
                category: {
                    select: { id: true, name: true, color: true },
                },
            },
        });

        res.json({
            success: true,
            data: {
                message: `${categoryIds.length} categories assigned to task`,
                taskId,
                categories: updatedTaskCategories.map((c) => c.category),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Bulk assign tasks to category
 */
async function bulkAssignTasksToCategory(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const categoryId = parseInt(req.params.categoryId);
        const { taskIds } = req.body;

        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Task IDs array is required",
            });
        }

        // Check if user owns the category
        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
                ownerId: user.id,
            },
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found or you don't own it",
            });
        }

        // Check if user has access to all tasks
        const accessibleTasks = await prisma.task.findMany({
            where: {
                id: { in: taskIds },
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            select: { id: true },
        });

        if (accessibleTasks.length !== taskIds.length) {
            return res.status(404).json({
                success: false,
                error: "Some tasks not found or you don't have access to them",
            });
        }

        // Remove existing assignments for these tasks to this category
        await prisma.categoryOnTask.deleteMany({
            where: {
                categoryId: categoryId,
                taskId: { in: taskIds },
            },
        });

        // Add new assignments
        const taskAssignments = taskIds.map((taskId) => ({
            categoryId,
            taskId,
        }));

        const result = await prisma.categoryOnTask.createMany({
            data: taskAssignments,
        });

        res.json({
            success: true,
            data: {
                message: `${result.count} tasks assigned to category "${category.name}"`,
                categoryId,
                assignedCount: result.count,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

module.exports = {
    addCategoryToTask,
    removeCategoryFromTask,
    getTaskCategories,
    getCategoryTasks,
    bulkAssignCategoriesToTask,
    bulkAssignTasksToCategory,
};
