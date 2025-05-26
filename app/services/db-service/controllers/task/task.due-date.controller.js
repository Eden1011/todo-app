const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");
const {
    notifyDueDateReminder,
} = require("../notification/notification.controller");

const prisma = new PrismaClient();

/**
 * Update task due date
 */
async function updateTaskDueDate(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { dueDate } = req.body;

        // Validate due date
        let parsedDueDate = null;
        if (dueDate) {
            parsedDueDate = new Date(dueDate);
            if (isNaN(parsedDueDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid due date format",
                });
            }
        }

        // Check if user owns the task (only owner can change due date)
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ownerId: user.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have permission to change its due date",
            });
        }

        // Update task due date
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                dueDate: parsedDueDate,
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
 * Get tasks due soon
 */
async function getTasksDueSoon(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            days = 7,
            page = 1,
            limit = 20,
            includeOverdue = true,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const daysAhead = parseInt(days);

        // Calculate date range
        const now = new Date();
        const futureDate = new Date(
            now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
        );

        // Build where clause
        const where = {
            status: { notIn: ["DONE", "CANCELED"] },
            OR: [{ ownerId: user.id }, { assigneeId: user.id }],
        };

        if (includeOverdue === "true") {
            where.dueDate = {
                lte: futureDate,
                not: null,
            };
        } else {
            where.dueDate = {
                gte: now,
                lte: futureDate,
            };
        }

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                skip,
                take,
                orderBy: { dueDate: "asc" },
                include: {
                    owner: { select: { id: true, authId: true } },
                    assignee: { select: { id: true, authId: true } },
                    project: { select: { id: true, name: true } },
                },
            }),
            prisma.task.count({ where }),
        ]);

        // Categorize tasks
        const categorizedTasks = {
            overdue: [],
            today: [],
            tomorrow: [],
            thisWeek: [],
            later: [],
        };

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const thisWeekEnd = new Date(today);
        thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

        tasks.forEach((task) => {
            const dueDate = new Date(task.dueDate);

            if (dueDate < now) {
                categorizedTasks.overdue.push(task);
            } else if (dueDate <= today) {
                categorizedTasks.today.push(task);
            } else if (dueDate <= tomorrow) {
                categorizedTasks.tomorrow.push(task);
            } else if (dueDate <= thisWeekEnd) {
                categorizedTasks.thisWeek.push(task);
            } else {
                categorizedTasks.later.push(task);
            }
        });

        res.json({
            success: true,
            data: {
                categorized: categorizedTasks,
                summary: {
                    overdue: categorizedTasks.overdue.length,
                    today: categorizedTasks.today.length,
                    tomorrow: categorizedTasks.tomorrow.length,
                    thisWeek: categorizedTasks.thisWeek.length,
                    later: categorizedTasks.later.length,
                    total,
                },
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
 * Get overdue tasks
 */
async function getOverdueTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            page = 1,
            limit = 20,
            sortBy = "dueDate",
            sortOrder = "asc",
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {
            dueDate: {
                lt: new Date(),
                not: null,
            },
            status: { notIn: ["DONE", "CANCELED"] },
            OR: [{ ownerId: user.id }, { assigneeId: user.id }],
        };

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

        // Calculate how overdue each task is
        const now = new Date();
        const tasksWithOverdueInfo = tasks.map((task) => ({
            ...task,
            overdueDays: Math.ceil(
                (now - new Date(task.dueDate)) / (1000 * 60 * 60 * 24),
            ),
        }));

        res.json({
            success: true,
            data: {
                tasks: tasksWithOverdueInfo,
                count: total,
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
 * Get tasks due today
 */
async function getTasksDueToday(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await prisma.task.findMany({
            where: {
                dueDate: {
                    gte: today,
                    lte: endOfDay,
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
                tasks,
                count: tasks.length,
                message:
                    tasks.length > 0
                        ? `You have ${tasks.length} tasks due today`
                        : "No tasks due today",
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
 * Send due date reminders
 */
async function sendDueDateReminders(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        // Get tasks due in the next 24 hours
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tasksDueSoon = await prisma.task.findMany({
            where: {
                dueDate: {
                    lte: tomorrow,
                    gte: new Date(),
                },
                status: { notIn: ["DONE", "CANCELED"] },
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
            },
        });

        let notificationsSent = 0;

        for (const task of tasksDueSoon) {
            // Send reminder to owner
            if (task.ownerId === user.id) {
                await notifyDueDateReminder(task.id, task.ownerId);
                notificationsSent++;
            }

            // Send reminder to assignee if different from owner
            if (
                task.assigneeId &&
                task.assigneeId !== task.ownerId &&
                task.assigneeId === user.id
            ) {
                await notifyDueDateReminder(task.id, task.assigneeId);
                notificationsSent++;
            }
        }

        res.json({
            success: true,
            data: {
                message: `Sent ${notificationsSent} due date reminders`,
                remindersSent: notificationsSent,
                tasksDueSoon: tasksDueSoon.length,
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
 * Bulk update due dates
 */
async function bulkUpdateDueDates(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { taskIds, dueDate, operation } = req.body;

        // Validate input
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Task IDs array is required",
            });
        }

        if (!operation || !["set", "extend", "clear"].includes(operation)) {
            return res.status(400).json({
                success: false,
                error: "Operation must be 'set', 'extend', or 'clear'",
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
                error: "You can only update due dates of tasks you own",
            });
        }

        let updateData = {};

        switch (operation) {
            case "set":
                if (!dueDate) {
                    return res.status(400).json({
                        success: false,
                        error: "Due date is required for 'set' operation",
                    });
                }
                updateData.dueDate = new Date(dueDate);
                break;

            case "extend":
                if (!dueDate || isNaN(parseInt(dueDate))) {
                    return res.status(400).json({
                        success: false,
                        error: "Number of days is required for 'extend' operation",
                    });
                }
                // This requires individual updates to extend each task's current due date
                break;

            case "clear":
                updateData.dueDate = null;
                break;
        }

        let updatedCount = 0;

        if (operation === "extend") {
            // Handle extend operation individually
            const extendDays = parseInt(dueDate);
            const tasks = await prisma.task.findMany({
                where: {
                    id: { in: taskIds },
                    ownerId: user.id,
                },
                select: { id: true, dueDate: true },
            });

            for (const task of tasks) {
                const newDueDate = task.dueDate
                    ? new Date(
                          task.dueDate.getTime() +
                              extendDays * 24 * 60 * 60 * 1000,
                      )
                    : new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);

                await prisma.task.update({
                    where: { id: task.id },
                    data: {
                        dueDate: newDueDate,
                        updatedAt: new Date(),
                    },
                });
                updatedCount++;
            }
        } else {
            // Handle set and clear operations
            const result = await prisma.task.updateMany({
                where: {
                    id: { in: taskIds },
                    ownerId: user.id,
                },
                data: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            });
            updatedCount = result.count;
        }

        res.json({
            success: true,
            data: {
                message: `${updatedCount} tasks updated`,
                updatedCount,
                operation,
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
 * Get due date statistics
 */
async function getDueDateStatistics(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [
            totalTasks,
            tasksWithDueDate,
            overdueTasks,
            tasksDueToday,
            tasksDueTomorrow,
            tasksDueThisWeek,
            tasksWithoutDueDate,
        ] = await Promise.all([
            prisma.task.count({
                where: {
                    status: { notIn: ["DONE", "CANCELED"] },
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
            prisma.task.count({
                where: {
                    dueDate: { not: null },
                    status: { notIn: ["DONE", "CANCELED"] },
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
            prisma.task.count({
                where: {
                    dueDate: { lt: now, not: null },
                    status: { notIn: ["DONE", "CANCELED"] },
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
            prisma.task.count({
                where: {
                    dueDate: { gte: now, lt: tomorrow },
                    status: { notIn: ["DONE", "CANCELED"] },
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
            prisma.task.count({
                where: {
                    dueDate: {
                        gte: tomorrow,
                        lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
                    },
                    status: { notIn: ["DONE", "CANCELED"] },
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
            prisma.task.count({
                where: {
                    dueDate: { gte: tomorrow, lt: nextWeek },
                    status: { notIn: ["DONE", "CANCELED"] },
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
            prisma.task.count({
                where: {
                    dueDate: null,
                    status: { notIn: ["DONE", "CANCELED"] },
                    OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                total: totalTasks,
                withDueDate: tasksWithDueDate,
                withoutDueDate: tasksWithoutDueDate,
                overdue: overdueTasks,
                dueToday: tasksDueToday,
                dueTomorrow: tasksDueTomorrow,
                dueThisWeek: tasksDueThisWeek,
                percentages: {
                    withDueDate:
                        totalTasks > 0
                            ? ((tasksWithDueDate / totalTasks) * 100).toFixed(2)
                            : 0,
                    overdue:
                        tasksWithDueDate > 0
                            ? ((overdueTasks / tasksWithDueDate) * 100).toFixed(
                                  2,
                              )
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
    updateTaskDueDate,
    getTasksDueSoon,
    getOverdueTasks,
    getTasksDueToday,
    sendDueDateReminders,
    bulkUpdateDueDates,
    getDueDateStatistics,
};
