const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");
const { checkProjectWriteAccess } = require("../access/project.access.js");

const prisma = new PrismaClient();

async function addCategoryToTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { categoryId } = req.body;

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

        if (task.projectId) {
            const hasWriteAccess = await checkProjectWriteAccess(
                task.projectId,
                user.id,
            );
            if (!hasWriteAccess) {
                return res.status(403).json({
                    success: false,
                    error: "Viewers cannot modify categories of tasks in projects.",
                });
            }
        }

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

async function removeCategoryFromTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const categoryId = parseInt(req.params.categoryId);

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

        if (task.projectId) {
            const hasWriteAccess = await checkProjectWriteAccess(
                task.projectId,
                user.id,
            );
            if (!hasWriteAccess) {
                return res.status(403).json({
                    success: false,
                    error: "Viewers cannot modify categories of tasks in projects.",
                });
            }
        }

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

        if (categoryOnTask.category.ownerId !== user.id) {
            return res.status(403).json({
                success: false,
                error: "You don't own this category",
            });
        }

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

async function getTaskCategories(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);

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

async function getCategoryTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const categoryId = parseInt(req.params.categoryId);

        const { page = 1, limit = 20, status, priority } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

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

module.exports = {
    addCategoryToTask,
    removeCategoryFromTask,
    getTaskCategories,
    getCategoryTasks,
};
