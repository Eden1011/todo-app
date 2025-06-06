const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");
const {
    notifyTaskStatusChanged,
} = require("../notification/notification.controller");

const prisma = new PrismaClient();

async function checkProjectWriteAccess(projectId, userId) {
    if (!projectId) return true;

    const member = await prisma.projectMember.findFirst({
        where: {
            projectId: projectId,
            userId: userId,
            role: { in: ["OWNER", "ADMIN", "MEMBER"] },
        },
    });
    return !!member;
}

async function updateTaskStatus(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { status } = req.body;

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

        if (task.projectId) {
            const hasWriteAccess = await checkProjectWriteAccess(
                task.projectId,
                user.id,
            );
            if (!hasWriteAccess) {
                return res.status(403).json({
                    success: false,
                    error: "Viewers cannot modify status of tasks in projects.",
                });
            }
        }

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

        const usersToNotify = [];
        usersToNotify.push(task.ownerId);
        if (task.assigneeId && task.assigneeId !== task.ownerId) {
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

async function getTaskStatusHistory(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);

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

async function getTasksByStatus(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { status } = req.params;

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
    getTasksByStatus,
    getStatusStatistics,
};
