const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");
const {
    notifyDueDateReminder,
} = require("../notification/notification.controller");
const { checkProjectWriteAccess } = require("../access/project.access.js");

const prisma = new PrismaClient();

async function updateTaskDueDate(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { dueDate } = req.body;

        let parsedDueDate = null;
        if (dueDate) {
            parsedDueDate = new Date(dueDate);
        }

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

        if (task.projectId) {
            const hasWriteAccess = await checkProjectWriteAccess(
                task.projectId,
                user.id,
            );
            if (!hasWriteAccess) {
                return res.status(403).json({
                    success: false,
                    error: "Viewers cannot modify due dates of tasks in projects.",
                });
            }
        }

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

        const now = new Date();
        const futureDate = new Date(
            now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
        );

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

async function sendDueDateReminders(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

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
            if (task.ownerId === user.id) {
                await notifyDueDateReminder(task.id, task.ownerId);
                notificationsSent++;
            }

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
    getDueDateStatistics,
};
