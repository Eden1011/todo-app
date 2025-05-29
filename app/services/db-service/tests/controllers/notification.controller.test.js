jest.mock("@prisma/client");

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        createMany: jest.fn(),
    },
    task: {
        findUnique: jest.fn(),
    },
    project: {
        findUnique: jest.fn(),
    },
    $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(
    () => mockPrismaClient,
);

const {
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
} = require("../../controllers/notification/notification.controller");

describe("Notification Controller", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaClient.$transaction.mockImplementation(async (callback) =>
            callback(mockPrismaClient),
        );

        req = {
            user: { id: 1 },
            body: {},
            query: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Mock getOrCreateUser
        mockPrismaClient.user.findUnique.mockResolvedValue({
            id: 1,
            authId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    describe("createNotification", () => {
        it("should create notification successfully", async () => {
            const mockNotification = {
                id: 1,
                userId: 1,
                type: "TASK_ASSIGNED",
                content: "You have been assigned to a task",
                relatedTaskId: 1,
                isRead: false,
                createdAt: new Date(),
            };

            mockPrismaClient.notification.create.mockResolvedValue(
                mockNotification,
            );

            const result = await createNotification(
                1,
                "TASK_ASSIGNED",
                "You have been assigned to a task",
                1,
            );

            expect(mockPrismaClient.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: 1,
                    type: "TASK_ASSIGNED",
                    content: "You have been assigned to a task",
                    relatedTaskId: 1,
                    isRead: false,
                },
            });

            expect(result).toEqual(mockNotification);
        });

        it("should handle error during creation", async () => {
            const consoleSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});
            mockPrismaClient.notification.create.mockRejectedValue(
                new Error("Database error"),
            );

            await expect(
                createNotification(1, "TASK_ASSIGNED", "Test"),
            ).rejects.toThrow("Database error");

            expect(consoleSpy).toHaveBeenCalledWith(
                "Failed to create notification:",
                expect.any(Error),
            );
            consoleSpy.mockRestore();
        });
    });

    describe("getNotifications", () => {
        it("should get notifications with default parameters", async () => {
            const mockNotifications = [
                {
                    id: 1,
                    type: "TASK_ASSIGNED",
                    content: "You have been assigned to a task",
                    isRead: false,
                    userId: 1,
                    relatedTaskId: 1,
                    createdAt: new Date(),
                    relatedTask: {
                        id: 1,
                        title: "Test Task",
                        status: "TODO",
                    },
                },
            ];

            mockPrismaClient.notification.findMany.mockResolvedValue(
                mockNotifications,
            );
            mockPrismaClient.notification.count
                .mockResolvedValueOnce(1) // total
                .mockResolvedValueOnce(1); // unread

            await getNotifications(req, res);

            expect(mockPrismaClient.notification.findMany).toHaveBeenCalledWith(
                {
                    where: { userId: 1 },
                    skip: 0,
                    take: 20,
                    orderBy: { createdAt: "desc" },
                    include: expect.any(Object),
                },
            );

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    notifications: mockNotifications,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 1,
                        totalPages: 1,
                    },
                    unreadCount: 1,
                },
            });
        });

        it("should filter by unread only", async () => {
            req.query = { unreadOnly: "true" };

            mockPrismaClient.notification.findMany.mockResolvedValue([]);
            mockPrismaClient.notification.count
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);

            await getNotifications(req, res);

            expect(mockPrismaClient.notification.findMany).toHaveBeenCalledWith(
                {
                    where: {
                        userId: 1,
                        isRead: false,
                    },
                    skip: 0,
                    take: 20,
                    orderBy: { createdAt: "desc" },
                    include: expect.any(Object),
                },
            );
        });

        it("should filter by type", async () => {
            req.query = { type: "TASK_ASSIGNED" };

            mockPrismaClient.notification.findMany.mockResolvedValue([]);
            mockPrismaClient.notification.count
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);

            await getNotifications(req, res);

            expect(mockPrismaClient.notification.findMany).toHaveBeenCalledWith(
                {
                    where: {
                        userId: 1,
                        type: "TASK_ASSIGNED",
                    },
                    skip: 0,
                    take: 20,
                    orderBy: { createdAt: "desc" },
                    include: expect.any(Object),
                },
            );
        });
    });

    describe("getNotificationById", () => {
        it("should return notification by id", async () => {
            req.params.id = "1";
            const mockNotification = {
                id: 1,
                type: "TASK_ASSIGNED",
                content: "You have been assigned to a task",
                isRead: false,
                userId: 1,
                relatedTaskId: 1,
                createdAt: new Date(),
                relatedTask: {
                    id: 1,
                    title: "Test Task",
                    status: "TODO",
                    description: "Test Description",
                },
            };

            mockPrismaClient.notification.findFirst.mockResolvedValue(
                mockNotification,
            );

            await getNotificationById(req, res);

            expect(
                mockPrismaClient.notification.findFirst,
            ).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    userId: 1,
                },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockNotification,
            });
        });

        it("should return 404 if notification not found", async () => {
            req.params.id = "999";
            mockPrismaClient.notification.findFirst.mockResolvedValue(null);

            await getNotificationById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Notification not found",
            });
        });
    });

    describe("markAsRead", () => {
        it("should mark notification as read", async () => {
            req.params.id = "1";
            const mockNotification = {
                id: 1,
                userId: 1,
                isRead: false,
            };
            const updatedNotification = {
                id: 1,
                userId: 1,
                isRead: true,
            };

            mockPrismaClient.notification.findFirst.mockResolvedValue(
                mockNotification,
            );
            mockPrismaClient.notification.update.mockResolvedValue(
                updatedNotification,
            );

            await markAsRead(req, res);

            expect(mockPrismaClient.notification.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isRead: true },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: updatedNotification,
            });
        });

        it("should return 404 if notification not found", async () => {
            req.params.id = "999";
            mockPrismaClient.notification.findFirst.mockResolvedValue(null);

            await markAsRead(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Notification not found",
            });
        });
    });

    describe("markAllAsRead", () => {
        it("should mark all notifications as read", async () => {
            mockPrismaClient.notification.updateMany.mockResolvedValue({
                count: 5,
            });

            await markAllAsRead(req, res);

            expect(
                mockPrismaClient.notification.updateMany,
            ).toHaveBeenCalledWith({
                where: {
                    userId: 1,
                    isRead: false,
                },
                data: {
                    isRead: true,
                },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "5 notifications marked as read" },
            });
        });
    });

    describe("deleteNotification", () => {
        it("should delete notification successfully", async () => {
            req.params.id = "1";
            const mockNotification = {
                id: 1,
                userId: 1,
            };

            mockPrismaClient.notification.findFirst.mockResolvedValue(
                mockNotification,
            );
            mockPrismaClient.notification.delete.mockResolvedValue(
                mockNotification,
            );

            await deleteNotification(req, res);

            expect(mockPrismaClient.notification.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "Notification deleted successfully" },
            });
        });
    });

    describe("deleteAllRead", () => {
        it("should delete all read notifications", async () => {
            mockPrismaClient.notification.deleteMany.mockResolvedValue({
                count: 3,
            });

            await deleteAllRead(req, res);

            expect(
                mockPrismaClient.notification.deleteMany,
            ).toHaveBeenCalledWith({
                where: {
                    userId: 1,
                    isRead: true,
                },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "3 read notifications deleted" },
            });
        });
    });

    describe("getNotificationStats", () => {
        it("should return notification statistics", async () => {
            mockPrismaClient.notification.count
                .mockResolvedValueOnce(10) // total
                .mockResolvedValueOnce(3); // unread

            mockPrismaClient.notification.groupBy.mockResolvedValue([
                { type: "TASK_ASSIGNED", _count: { id: 5 } },
                { type: "DUE_DATE_REMINDER", _count: { id: 3 } },
                { type: "TASK_STATUS_CHANGED", _count: { id: 2 } },
            ]);

            await getNotificationStats(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    totalCount: 10,
                    unreadCount: 3,
                    readCount: 7,
                    byType: {
                        TASK_ASSIGNED: 5,
                        DUE_DATE_REMINDER: 3,
                        TASK_STATUS_CHANGED: 2,
                    },
                },
            });
        });
    });

    describe("Utility Functions", () => {
        describe("notifyTaskAssigned", () => {
            it("should create task assignment notification", async () => {
                const mockTask = { title: "Test Task" };
                mockPrismaClient.task.findUnique.mockResolvedValue(mockTask);
                mockPrismaClient.notification.create.mockResolvedValue({});

                await notifyTaskAssigned(1, 2, 1);

                expect(mockPrismaClient.task.findUnique).toHaveBeenCalledWith({
                    where: { id: 1 },
                    select: { title: true },
                });

                expect(
                    mockPrismaClient.notification.create,
                ).toHaveBeenCalledWith({
                    data: {
                        userId: 2,
                        type: "TASK_ASSIGNED",
                        content: "You have been assigned to task: Test Task",
                        relatedTaskId: 1,
                        isRead: false,
                    },
                });
            });

            it("should handle error gracefully", async () => {
                const consoleSpy = jest
                    .spyOn(console, "error")
                    .mockImplementation(() => {});
                mockPrismaClient.task.findUnique.mockRejectedValue(
                    new Error("Database error"),
                );

                await notifyTaskAssigned(1, 2, 1);

                expect(consoleSpy).toHaveBeenCalledWith(
                    "Failed to create task assignment notification:",
                    expect.any(Error),
                );
                consoleSpy.mockRestore();
            });
        });

        describe("notifyTaskStatusChanged", () => {
            it("should create status change notifications", async () => {
                const mockTask = { title: "Test Task" };
                mockPrismaClient.task.findUnique.mockResolvedValue(mockTask);
                mockPrismaClient.notification.createMany.mockResolvedValue({
                    count: 2,
                });

                await notifyTaskStatusChanged(1, "IN_PROGRESS", [2, 3]);

                expect(
                    mockPrismaClient.notification.createMany,
                ).toHaveBeenCalledWith({
                    data: [
                        {
                            userId: 2,
                            type: "TASK_STATUS_CHANGED",
                            content:
                                'Task "Test Task" status changed to IN_PROGRESS',
                            relatedTaskId: 1,
                            isRead: false,
                        },
                        {
                            userId: 3,
                            type: "TASK_STATUS_CHANGED",
                            content:
                                'Task "Test Task" status changed to IN_PROGRESS',
                            relatedTaskId: 1,
                            isRead: false,
                        },
                    ],
                });
            });

            it("should not create notifications if no users provided", async () => {
                await notifyTaskStatusChanged(1, "IN_PROGRESS", []);

                expect(mockPrismaClient.task.findUnique).not.toHaveBeenCalled();
                expect(
                    mockPrismaClient.notification.createMany,
                ).not.toHaveBeenCalled();
            });
        });

        describe("notifyDueDateReminder", () => {
            it("should create due date reminder notification", async () => {
                const mockTask = {
                    title: "Test Task",
                    dueDate: new Date("2025-06-01T10:00:00.000Z"),
                };
                mockPrismaClient.task.findUnique.mockResolvedValue(mockTask);
                mockPrismaClient.notification.create.mockResolvedValue({});

                await notifyDueDateReminder(1, 2);

                expect(
                    mockPrismaClient.notification.create,
                ).toHaveBeenCalledWith({
                    data: {
                        userId: 2,
                        type: "DUE_DATE_REMINDER",
                        content: 'Task "Test Task" is due soon',
                        relatedTaskId: 1,
                        isRead: false,
                    },
                });
            });

            it("should not create notification if task has no due date", async () => {
                const mockTask = {
                    title: "Test Task",
                    dueDate: null,
                };
                mockPrismaClient.task.findUnique.mockResolvedValue(mockTask);

                await notifyDueDateReminder(1, 2);

                expect(
                    mockPrismaClient.notification.create,
                ).not.toHaveBeenCalled();
            });
        });

        describe("notifyProjectInvite", () => {
            it("should create project invite notification", async () => {
                const mockProject = { name: "Test Project" };
                mockPrismaClient.project.findUnique.mockResolvedValue(
                    mockProject,
                );
                mockPrismaClient.notification.create.mockResolvedValue({});

                await notifyProjectInvite(1, 2, 1);

                expect(
                    mockPrismaClient.project.findUnique,
                ).toHaveBeenCalledWith({
                    where: { id: 1 },
                    select: { name: true },
                });

                expect(
                    mockPrismaClient.notification.create,
                ).toHaveBeenCalledWith({
                    data: {
                        userId: 2,
                        type: "PROJECT_INVITE",
                        content:
                            "You have been invited to project: Test Project",
                        relatedTaskId: null,
                        isRead: false,
                    },
                });
            });
        });
    });
});
