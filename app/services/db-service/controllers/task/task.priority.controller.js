const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

/**
 * Update task priority
 */
async function updateTaskPriority(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { priority } = req.body;

        // Validate priority
        const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
        if (!priority || !validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                error: `Invalid priority. Valid priorities are: ${validPriorities.join(", ")}`,
            });
        }

        // Check if user owns the task (only owner can change priority)
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ownerId: user.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have permission to change its priority",
            });
        }

        // Update task priority
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                priority,
                updatedAt: new Date(),
            },
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

/**
 * Get tasks by priority for user
 */
async function getTasksByPriority(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { priority } = req.params;

        // Validate priority
        const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                error: `Invalid priority. Valid priorities are: ${validPriorities.join(", ")}`,
            });
        }

        const {
            page = 1,
            limit = 20,
            status,
            sortBy = "dueDate",
            sortOrder = "asc",
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {
            priority,
            OR: [{ ownerId: user.id }, { assigneeId: user.id }],
        };

        if (status) {
            where.status = status;
        }

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
                },
            }),
            prisma.task.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                priority,
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
 * Get priority statistics for user
 */
async function getPriorityStatistics(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const stats = await prisma.task.groupBy({
            by: ["priority"],
            where: {
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            _count: { id: true },
        });

        const priorityStats = {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
            URGENT: 0,
        };

        stats.forEach((stat) => {
            priorityStats[stat.priority] = stat._count.id;
        });

        const total = Object.values(priorityStats).reduce(
            (sum, count) => sum + count,
            0,
        );

        // Get urgent tasks due soon
        const urgentTasksDueSoon = await prisma.task.count({
            where: {
                priority: "URGENT",
                dueDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
                },
                status: { not: "DONE" },
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        res.json({
            success: true,
            data: {
                byPriority: priorityStats,
                total,
                urgentTasksDueSoon,
                distribution: {
                    urgent:
                        total > 0
                            ? ((priorityStats.URGENT / total) * 100).toFixed(2)
                            : 0,
                    high:
                        total > 0
                            ? ((priorityStats.HIGH / total) * 100).toFixed(2)
                            : 0,
                    medium:
                        total > 0
                            ? ((priorityStats.MEDIUM / total) * 100).toFixed(2)
                            : 0,
                    low:
                        total > 0
                            ? ((priorityStats.LOW / total) * 100).toFixed(2)
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

/**
 * Get high priority overdue tasks
 */
async function getHighPriorityOverdueTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const overdueTasks = await prisma.task.findMany({
            where: {
                priority: { in: ["HIGH", "URGENT"] },
                dueDate: {
                    lt: new Date(),
                },
                status: { notIn: ["DONE", "CANCELED"] },
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
            },
        });

        res.json({
            success: true,
            data: {
                tasks: overdueTasks,
                count: overdueTasks.length,
                message:
                    overdueTasks.length > 0
                        ? `You have ${overdueTasks.length} high priority overdue tasks`
                        : "No high priority overdue tasks",
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
    updateTaskPriority,
    getTasksByPriority,
    getPriorityStatistics,
    getHighPriorityOverdueTasks,
};
