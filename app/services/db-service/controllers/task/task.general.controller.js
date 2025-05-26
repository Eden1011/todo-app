const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

/**
 * Create a new task
 */
async function createTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            title,
            description,
            priority = "MEDIUM",
            status = "TODO",
            dueDate,
            assigneeAuthId,
            projectId,
            categoryIds = [],
            tagIds = [],
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: "Title is required",
            });
        }

        // Validate assignee if provided
        let assigneeId = null;
        if (assigneeAuthId) {
            const assignee = await getOrCreateUser(assigneeAuthId);
            assigneeId = assignee.id;
        }

        // Validate project ownership/membership if provided
        if (projectId) {
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    OR: [
                        { ownerId: user.id },
                        { members: { some: { userId: user.id } } },
                    ],
                },
            });

            if (!project) {
                return res.status(403).json({
                    success: false,
                    error: "You don't have access to this project",
                });
            }
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority,
                status,
                dueDate: dueDate ? new Date(dueDate) : null,
                ownerId: user.id,
                assigneeId,
                projectId,
                categories: {
                    create: categoryIds.map((categoryId) => ({
                        category: { connect: { id: categoryId } },
                    })),
                },
                tags: {
                    create: tagIds.map((tagId) => ({
                        tag: { connect: { id: tagId } },
                    })),
                },
            },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
                categories: {
                    include: {
                        category: { select: { id: true, name: true } },
                    },
                },
                tags: {
                    include: {
                        tag: { select: { id: true, name: true } },
                    },
                },
            },
        });

        res.status(201).json({
            success: true,
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get tasks with filtering and pagination
 */
async function getTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            page = 1,
            limit = 20,
            status,
            priority,
            projectId,
            assignedToMe,
            search,
            sortBy = "updatedAt",
            sortOrder = "desc",
            categoryId,
            tagId,
            dueDateFrom,
            dueDateTo,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {
            OR: [{ ownerId: user.id }, { assigneeId: user.id }],
        };

        // Apply filters
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (projectId) where.projectId = parseInt(projectId);
        if (assignedToMe === "true") where.assigneeId = user.id;
        if (categoryId) {
            where.categories = {
                some: { categoryId: parseInt(categoryId) },
            };
        }
        if (tagId) {
            where.tags = {
                some: { tagId: parseInt(tagId) },
            };
        }
        if (dueDateFrom || dueDateTo) {
            where.dueDate = {};
            if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
            if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        // Get tasks and total count
        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    owner: { select: { id: true, authId: true } },
                    assignee: { select: { id: true, authId: true } },
                    project: { select: { id: true, name: true } },
                    categories: {
                        include: {
                            category: { select: { id: true, name: true } },
                        },
                    },
                    tags: {
                        include: {
                            tag: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            prisma.task.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                tasks,
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
 * Get task by ID
 */
async function getTaskById(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id);

        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
                categories: {
                    include: {
                        category: { select: { id: true, name: true } },
                    },
                },
                tags: {
                    include: {
                        tag: { select: { id: true, name: true } },
                    },
                },
                recurringPattern: true,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        res.json({
            success: true,
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Update task
 */
async function updateTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id);

        const {
            title,
            description,
            priority,
            status,
            dueDate,
            assigneeAuthId,
            projectId,
            categoryIds,
            tagIds,
        } = req.body;

        // Check if user has access to task
        const existingTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Only owner can modify certain fields
        const isOwner = existingTask.ownerId === user.id;
        const updateData = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (dueDate !== undefined)
            updateData.dueDate = dueDate ? new Date(dueDate) : null;

        // Status can be updated by owner or assignee
        if (status !== undefined) updateData.status = status;

        // Owner-only fields
        if (isOwner) {
            if (priority !== undefined) updateData.priority = priority;
            if (projectId !== undefined) updateData.projectId = projectId;

            if (assigneeAuthId !== undefined) {
                if (assigneeAuthId) {
                    const assignee = await getOrCreateUser(assigneeAuthId);
                    updateData.assigneeId = assignee.id;
                } else {
                    updateData.assigneeId = null;
                }
            }
        }

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
                categories: {
                    include: {
                        category: { select: { id: true, name: true } },
                    },
                },
                tags: {
                    include: {
                        tag: { select: { id: true, name: true } },
                    },
                },
            },
        });

        // Update categories if provided (owner only)
        if (isOwner && categoryIds !== undefined) {
            await prisma.categoryOnTask.deleteMany({
                where: { taskId },
            });

            if (categoryIds.length > 0) {
                await prisma.categoryOnTask.createMany({
                    data: categoryIds.map((categoryId) => ({
                        taskId,
                        categoryId,
                    })),
                });
            }
        }

        // Update tags if provided (owner only)
        if (isOwner && tagIds !== undefined) {
            await prisma.tagOnTask.deleteMany({
                where: { taskId },
            });

            if (tagIds.length > 0) {
                await prisma.tagOnTask.createMany({
                    data: tagIds.map((tagId) => ({
                        taskId,
                        tagId,
                    })),
                });
            }
        }

        res.json({
            success: true,
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Delete task
 */
async function deleteTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id);

        // Check if user owns the task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ownerId: user.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have permission to delete it",
            });
        }

        await prisma.task.delete({
            where: { id: taskId },
        });

        res.json({
            success: true,
            data: {
                message: "Task deleted successfully",
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
 * Assign task to user
 */
async function assignTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id);
        const { assigneeAuthId } = req.body;

        // Check if user owns the task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ownerId: user.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have permission to assign it",
            });
        }

        let assigneeId = null;
        if (assigneeAuthId) {
            const assignee = await getOrCreateUser(assigneeAuthId);
            assigneeId = assignee.id;
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: { assigneeId },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
            },
        });

        res.json({
            success: true,
            data: updatedTask,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask,
};
