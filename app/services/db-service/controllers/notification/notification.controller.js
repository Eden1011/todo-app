const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

/**
 * Create a new notification
 */
async function createNotification(userId, type, content, relatedTaskId = null) {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                content,
                relatedTaskId,
                isRead: false,
            },
        });

        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error);
        throw error;
    }
}

/**
 * Get notifications for user
 */
async function getNotifications(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            page = 1,
            limit = 20,
            unreadOnly = false,
            type,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {
            userId: user.id,
        };

        if (unreadOnly === "true") {
            where.isRead = false;
        }

        if (type) {
            where.type = type;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    relatedTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                        },
                    },
                },
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({
                where: {
                    userId: user.id,
                    isRead: false,
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
                unreadCount,
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
 * Get notification by ID
 */
async function getNotificationById(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: user.id,
            },
            include: {
                relatedTask: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        description: true,
                    },
                },
            },
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: "Notification not found",
            });
        }

        res.json({
            success: true,
            data: notification,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Mark notification as read
 */
async function markAsRead(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: user.id,
            },
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: "Notification not found",
            });
        }

        const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });

        res.json({
            success: true,
            data: updatedNotification,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const result = await prisma.notification.updateMany({
            where: {
                userId: user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        res.json({
            success: true,
            data: {
                message: `${result.count} notifications marked as read`,
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
 * Delete notification
 */
async function deleteNotification(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: user.id,
            },
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: "Notification not found",
            });
        }

        await prisma.notification.delete({
            where: { id: notificationId },
        });

        res.json({
            success: true,
            data: {
                message: "Notification deleted successfully",
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
 * Delete all read notifications
 */
async function deleteAllRead(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const result = await prisma.notification.deleteMany({
            where: {
                userId: user.id,
                isRead: true,
            },
        });

        res.json({
            success: true,
            data: {
                message: `${result.count} read notifications deleted`,
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
 * Get notification statistics
 */
async function getNotificationStats(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const [totalCount, unreadCount, notificationsByType] =
            await Promise.all([
                prisma.notification.count({
                    where: { userId: user.id },
                }),
                prisma.notification.count({
                    where: { userId: user.id, isRead: false },
                }),
                prisma.notification.groupBy({
                    by: ["type"],
                    where: { userId: user.id },
                    _count: { id: true },
                }),
            ]);

        const typeStats = notificationsByType.reduce((acc, item) => {
            acc[item.type] = item._count.id;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                totalCount,
                unreadCount,
                readCount: totalCount - unreadCount,
                byType: typeStats,
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
 * Utility function to create task assignment notification
 */
async function notifyTaskAssigned(taskId, assigneeUserId, assignerAuthId) {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { title: true },
        });

        if (task) {
            await createNotification(
                assigneeUserId,
                "TASK_ASSIGNED",
                `You have been assigned to task: ${task.title}`,
                taskId,
            );
        }
    } catch (error) {
        console.error("Failed to create task assignment notification:", error);
    }
}

/**
 * Utility function to create task status change notification
 */
async function notifyTaskStatusChanged(taskId, newStatus, userIds) {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { title: true },
        });

        if (task && userIds.length > 0) {
            const notifications = userIds.map((userId) => ({
                userId,
                type: "TASK_STATUS_CHANGED",
                content: `Task "${task.title}" status changed to ${newStatus}`,
                relatedTaskId: taskId,
                isRead: false,
            }));

            await prisma.notification.createMany({
                data: notifications,
            });
        }
    } catch (error) {
        console.error(
            "Failed to create task status change notifications:",
            error,
        );
    }
}

/**
 * Utility function to create due date reminder notification
 */
async function notifyDueDateReminder(taskId, userId) {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { title: true, dueDate: true },
        });

        if (task && task.dueDate) {
            await createNotification(
                userId,
                "DUE_DATE_REMINDER",
                `Task "${task.title}" is due soon`,
                taskId,
            );
        }
    } catch (error) {
        console.error(
            "Failed to create due date reminder notification:",
            error,
        );
    }
}

/**
 * Utility function to create project invite notification
 */
async function notifyProjectInvite(projectId, userId, inviterAuthId) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true },
        });

        if (project) {
            await createNotification(
                userId,
                "PROJECT_INVITE",
                `You have been invited to project: ${project.name}`,
                null,
            );
        }
    } catch (error) {
        console.error("Failed to create project invite notification:", error);
    }
}

module.exports = {
    createNotification,
    getNotifications,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getNotificationStats,
    notifyTaskAssigned,
    notifyTaskStatusChanged,
    notifyDueDateReminder,
    notifyProjectInvite,
};
