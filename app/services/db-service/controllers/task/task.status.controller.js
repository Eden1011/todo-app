const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");
const { notifyTaskStatusChanged } = require("../notification.controller");

const prisma = new PrismaClient();

/**
 * Update task status
 */
async function updateTaskStatus(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { status } = req.body;

        // Validate status
        const validStatuses = [
            "TODO",
            "IN_PROGRESS",
            "REVIEW",
            "DONE",
            "CANCELED",
        ];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`,
            });
        }

        // Check if user has access to task (owner or assignee)
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Update task status
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                updatedAt: new Date(),
            },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
            },
        });

        // Notify relevant users about status change
        const usersToNotify = [];
        if (task.ownerId !== user.id) {
            usersToNotify.push(task.ownerId);
        }
        if (task.assigneeId && task.assigneeId !== user.id) {
            usersToNotify.push(task.assigneeId);
        }

        if (usersToNotify.length > 0) {
            await notifyTaskStatusChanged(taskId, status, usersToNotify);
        }

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

/**
 * Get task status history (if we had status history tracking)
 */
async function getTaskStatusHistory(req, res) {
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
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // For now, return current status info
        // In a real application, you might have a separate TaskStatusHistory table
        res.json({
            success: true,
            data: {
                taskId: task.id,
                currentStatus: task.status,
                createdAt: task.createdAt,
                lastUpdated: task.updatedAt,
                history: [
                    {
                        status: "TODO",
                        timestamp: task.createdAt,
                        note: "Task created",
                    },
                    {
                        status: task.status,
                        timestamp: task.updatedAt,
                        note: "Current status",
                    },
                ],
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
 * Bulk update task statuses
 */
async function bulkUpdateTaskStatus(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { taskIds, status } = req.body;

        // Validate input
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Task IDs array is required",
            });
        }

        const validStatuses = [
            "TODO",
            "IN_PROGRESS",
            "REVIEW",
            "DONE",
            "CANCELED",
        ];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`,
            });
        }

        // Check if user has access to all tasks
        const tasks = await prisma.task.findMany({
            where: {
                id: { in: taskIds },
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            select: {
                id: true,
                title: true,
                ownerId: true,
                assigneeId: true,
            },
        });

        if (tasks.length !== taskIds.length) {
            return res.status(404).json({
                success: false,
                error: "Some tasks not found or you don't have access to them",
            });
        }

        // Update all tasks
        const result = await prisma.task.updateMany({
            where: {
                id: { in: taskIds },
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            data: {
                status,
                updatedAt: new Date(),
            },
        });

        // Send notifications for each task
        for (const task of tasks) {
            const usersToNotify = [];
            if (task.ownerId !== user.id) {
                usersToNotify.push(task.ownerId);
            }
            if (task.assigneeId && task.assigneeId !== user.id) {
                usersToNotify.push(task.assigneeId);
            }

            if (usersToNotify.length > 0) {
                await notifyTaskStatusChanged(task.id, status, usersToNotify);
            }
        }

        res.json({
            success: true,
            data: {
                message: `${result.count} tasks updated to ${status} status`,
                updatedCount: result.count,
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
 * Get tasks by status for user
 */
async function getTasksByStatus(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { status } = req.params;

        // Validate status
        const validStatuses = [
            "TODO",
            "IN_PROGRESS",
            "REVIEW",
            "DONE",
            "CANCELED",
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`,
            });
        }

        const {
            page = 1,
            limit = 20,
            sortBy = "updatedAt",
            sortOrder = "desc",
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where: {
                    status,
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    owner: { select: { id: true, authId: true } },
                    assignee: { select: { id: true, authId: true } },
                    project: { select: { id: true, name: true } },
                },
            }),
            prisma.task.count({
                where: {
                    status,
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                status,
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
 * Get status statistics for user
 */
async function getStatusStatistics(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const stats = await prisma.task.groupBy({
            by: ["status"],
            where: {
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            _count: { id: true },
        });

        const statusStats = {
            TODO: 0,
            IN_PROGRESS: 0,
            REVIEW: 0,
            DONE: 0,
            CANCELED: 0,
        };

        stats.forEach((stat) => {
            statusStats[stat.status] = stat._count.id;
        });

        const total = Object.values(statusStats).reduce(
            (sum, count) => sum + count,
            0,
        );

        res.json({
            success: true,
            data: {
                byStatus: statusStats,
                total,
                completion: {
                    completed: statusStats.DONE,
                    inProgress: statusStats.IN_PROGRESS + statusStats.REVIEW,
                    pending: statusStats.TODO,
                    canceled: statusStats.CANCELED,
                    completionRate:
                        total > 0
                            ? ((statusStats.DONE / total) * 100).toFixed(2)
                            : 0,
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
    updateTaskStatus,
    getTaskStatusHistory,
    bulkUpdateTaskStatus,
    getTasksByStatus,
    getStatusStatistics,
};
