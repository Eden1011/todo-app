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
 * Bulk update task priorities
 */
async function bulkUpdateTaskPriority(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { taskIds, priority } = req.body;

        // Validate input
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Task IDs array is required",
            });
        }

        const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
        if (!priority || !validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                error: `Invalid priority. Valid priorities are: ${validPriorities.join(", ")}`,
            });
        }

        // Check if user owns all tasks
        const ownedTasksCount = await prisma.task.count({
            where: {
                id: { in: taskIds },
                ownerId: user.id,
            },
        });

        if (ownedTasksCount !== taskIds.length) {
            return res.status(403).json({
                success: false,
                error: "You can only update priority of tasks you own",
            });
        }

        // Update all tasks
        const result = await prisma.task.updateMany({
            where: {
                id: { in: taskIds },
                ownerId: user.id,
            },
            data: {
                priority,
                updatedAt: new Date(),
            },
        });

        res.json({
            success: true,
            data: {
                message: `${result.count} tasks updated to ${priority} priority`,
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

/**
 * Auto-prioritize tasks based on due date and other factors
 */
async function autoPrioritizeTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        // Get tasks that need auto-prioritization (owned tasks only)
        const tasks = await prisma.task.findMany({
            where: {
                ownerId: user.id,
                status: { notIn: ["DONE", "CANCELED"] },
                dueDate: { not: null },
            },
            select: {
                id: true,
                title: true,
                dueDate: true,
                priority: true,
            },
        });

        if (tasks.length === 0) {
            return res.json({
                success: true,
                data: {
                    message: "No tasks to auto-prioritize",
                    updatedCount: 0,
                },
            });
        }

        const now = new Date();
        const updates = [];

        tasks.forEach((task) => {
            const daysUntilDue = Math.ceil(
                (task.dueDate - now) / (1000 * 60 * 60 * 24),
            );
            let suggestedPriority = task.priority;

            if (daysUntilDue <= 1) {
                suggestedPriority = "URGENT";
            } else if (daysUntilDue <= 3) {
                suggestedPriority = "HIGH";
            } else if (daysUntilDue <= 7) {
                suggestedPriority = "MEDIUM";
            } else {
                suggestedPriority = "LOW";
            }

            if (suggestedPriority !== task.priority) {
                updates.push({
                    id: task.id,
                    newPriority: suggestedPriority,
                    oldPriority: task.priority,
                    daysUntilDue,
                });
            }
        });

        // Apply updates
        let updatedCount = 0;
        for (const update of updates) {
            await prisma.task.update({
                where: { id: update.id },
                data: {
                    priority: update.newPriority,
                    updatedAt: new Date(),
                },
            });
            updatedCount++;
        }

        res.json({
            success: true,
            data: {
                message: `Auto-prioritized ${updatedCount} tasks`,
                updatedCount,
                changes: updates.map((u) => ({
                    taskId: u.id,
                    from: u.oldPriority,
                    to: u.newPriority,
                    reason: `Due in ${u.daysUntilDue} days`,
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

module.exports = {
    updateTaskPriority,
    bulkUpdateTaskPriority,
    getTasksByPriority,
    getPriorityStatistics,
    getHighPriorityOverdueTasks,
    autoPrioritizeTasks,
};
