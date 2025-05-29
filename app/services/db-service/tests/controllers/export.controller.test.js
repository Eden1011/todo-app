jest.mock("@prisma/client");

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    task: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    project: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    category: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    tag: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    notification: {
        findMany: jest.fn(),
    },
    $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(
    () => mockPrismaClient,
);

const {
    exportTasksToCSV,
    exportTasksToJSON,
    exportProjectsToCSV,
    exportProjectsToJSON,
    getExportInfo,
    exportUserDataBackup,
} = require("../../controllers/export/export.controller");

describe("Export Controller", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaClient.$transaction.mockImplementation(async (callback) =>
            callback(mockPrismaClient),
        );

        req = {
            user: { id: 1 },
            query: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            send: jest.fn(),
        };

        // Mock getOrCreateUser
        mockPrismaClient.user.findUnique.mockResolvedValue({
            id: 1,
            authId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    describe("exportTasksToCSV", () => {
        it("should export tasks to CSV format", async () => {
            const mockTasks = [
                {
                    id: 1,
                    title: "Test Task",
                    description: "Test Description",
                    status: "TODO",
                    priority: "HIGH",
                    dueDate: new Date("2025-06-01T10:00:00.000Z"),
                    createdAt: new Date("2025-05-01T10:00:00.000Z"),
                    updatedAt: new Date("2025-05-01T12:00:00.000Z"),
                    owner: { authId: 1 },
                    assignee: { authId: 2 },
                    project: { name: "Test Project" },
                    categories: [
                        { category: { name: "Work" } },
                        { category: { name: "Urgent" } },
                    ],
                    tags: [{ tag: { name: "important" } }],
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);

            await exportTasksToCSV(req, res);

            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Type",
                "text/csv",
            );
            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Disposition",
                expect.stringContaining('attachment; filename="tasks_export_'),
            );
            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining("ID,Title,Description"),
            );
        });

        it("should apply filters to CSV export", async () => {
            req.query = {
                projectId: "1",
                status: "TODO",
                priority: "HIGH",
                includeArchived: "false",
            };

            mockPrismaClient.task.findMany.mockResolvedValue([]);

            await exportTasksToCSV(req, res);

            expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [{ ownerId: 1 }, { assigneeId: 1 }],
                    projectId: 1,
                    status: "TODO",
                    priority: "HIGH",
                    status: { notIn: ["CANCELED"] },
                },
                include: expect.any(Object),
                orderBy: { createdAt: "asc" },
            });
        });

        it("should handle tasks with null values", async () => {
            const mockTasks = [
                {
                    id: 1,
                    title: "Test Task",
                    description: null,
                    status: "TODO",
                    priority: "HIGH",
                    dueDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    owner: { authId: 1 },
                    assignee: null,
                    project: null,
                    categories: [],
                    tags: [],
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);

            await exportTasksToCSV(req, res);

            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining('Test Task,"",TODO,HIGH,,,,1,,"",""'),
            );
        });

        it("should escape quotes in CSV data", async () => {
            const mockTasks = [
                {
                    id: 1,
                    title: 'Task with "quotes"',
                    description: 'Description with "quotes"',
                    status: "TODO",
                    priority: "HIGH",
                    dueDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    owner: { authId: 1 },
                    assignee: null,
                    project: { name: 'Project with "quotes"' },
                    categories: [],
                    tags: [],
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);

            await exportTasksToCSV(req, res);

            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining('"Task with ""quotes"""'),
            );
        });
    });

    describe("exportTasksToJSON", () => {
        it("should export tasks to JSON format", async () => {
            const mockTasks = [
                {
                    id: 1,
                    title: "Test Task",
                    description: "Test Description",
                    status: "TODO",
                    priority: "HIGH",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    owner: { authId: 1 },
                    assignee: null,
                    project: { id: 1, name: "Test Project" },
                    categories: [],
                    tags: [],
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);

            await exportTasksToJSON(req, res);

            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Type",
                "application/json",
            );
            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Disposition",
                expect.stringContaining('attachment; filename="tasks_export_'),
            );
            expect(res.json).toHaveBeenCalledWith({
                exportInfo: {
                    exportedAt: expect.any(String),
                    exportedBy: 1,
                    totalTasks: 1,
                    filters: {
                        projectId: null,
                        status: null,
                        priority: null,
                        includeArchived: false,
                    },
                },
                tasks: mockTasks,
            });
        });

        it("should export detailed JSON when detailed=true", async () => {
            req.query = { detailed: "true" };

            mockPrismaClient.task.findMany.mockResolvedValue([]);

            await exportTasksToJSON(req, res);

            expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
                where: expect.any(Object),
                include: {
                    owner: { select: { authId: true } },
                    assignee: { select: { authId: true } },
                    project: { select: { id: true, name: true } },
                    categories: {
                        include: {
                            category: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                    tags: {
                        include: {
                            tag: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            });
        });

        it("should export minimal JSON when detailed=false", async () => {
            req.query = { detailed: "false" };

            mockPrismaClient.task.findMany.mockResolvedValue([]);

            await exportTasksToJSON(req, res);

            expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
                where: expect.any(Object),
                include: {
                    owner: { select: { authId: true } },
                    assignee: { select: { authId: true } },
                },
                orderBy: { createdAt: "asc" },
            });
        });
    });

    describe("exportProjectsToCSV", () => {
        it("should export projects to CSV format", async () => {
            const mockProjects = [
                {
                    id: 1,
                    name: "Test Project",
                    description: "Test Description",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    owner: { authId: 1 },
                    members: [
                        { user: { authId: 1 }, role: "OWNER" },
                        { user: { authId: 2 }, role: "MEMBER" },
                    ],
                    _count: { tasks: 5, members: 2 },
                },
            ];

            mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);

            await exportProjectsToCSV(req, res);

            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Type",
                "text/csv",
            );
            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining(
                    "ID,Name,Description,Owner,Members Count,Tasks Count",
                ),
            );
        });

        it("should filter by ownedOnly", async () => {
            req.query = { ownedOnly: "true" };

            mockPrismaClient.project.findMany.mockResolvedValue([]);

            await exportProjectsToCSV(req, res);

            expect(mockPrismaClient.project.findMany).toHaveBeenCalledWith({
                where: { ownerId: 1 },
                include: expect.any(Object),
                orderBy: { createdAt: "asc" },
            });
        });
    });

    describe("exportProjectsToJSON", () => {
        it("should export projects to JSON format", async () => {
            const mockProjects = [
                {
                    id: 1,
                    name: "Test Project",
                    description: "Test Description",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    owner: { authId: 1 },
                    members: [],
                    _count: { tasks: 0, members: 1 },
                },
            ];

            mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);

            await exportProjectsToJSON(req, res);

            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Type",
                "application/json",
            );
            expect(res.json).toHaveBeenCalledWith({
                exportInfo: {
                    exportedAt: expect.any(String),
                    exportedBy: 1,
                    totalProjects: 1,
                    filters: {
                        ownedOnly: false,
                        includeTasks: false,
                    },
                },
                projects: mockProjects,
            });
        });

        it("should include tasks when includeTasks=true", async () => {
            req.query = { includeTasks: "true" };

            mockPrismaClient.project.findMany.mockResolvedValue([]);

            await exportProjectsToJSON(req, res);

            expect(mockPrismaClient.project.findMany).toHaveBeenCalledWith({
                where: expect.any(Object),
                include: {
                    owner: { select: { authId: true } },
                    members: {
                        include: {
                            user: { select: { authId: true } },
                        },
                    },
                    _count: {
                        select: { tasks: true, members: true },
                    },
                    tasks: {
                        include: {
                            owner: { select: { authId: true } },
                            assignee: { select: { authId: true } },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            });
        });
    });

    describe("getExportInfo", () => {
        it("should return export information", async () => {
            mockPrismaClient.task.count.mockResolvedValue(10);
            mockPrismaClient.project.count.mockResolvedValue(3);
            mockPrismaClient.category.count.mockResolvedValue(5);
            mockPrismaClient.tag.count.mockResolvedValue(8);

            await getExportInfo(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    availableData: {
                        tasks: 10,
                        projects: 3,
                        categories: 5,
                        tags: 8,
                    },
                    supportedFormats: {
                        tasks: ["CSV", "JSON"],
                        projects: ["CSV", "JSON"],
                        categories: ["CSV", "JSON"],
                        tags: ["CSV", "JSON"],
                    },
                    exportOptions: {
                        tasks: {
                            filters: [
                                "projectId",
                                "status",
                                "priority",
                                "includeArchived",
                            ],
                            formats: {
                                CSV: "Comma-separated values for spreadsheet import",
                                JSON: "Structured data format with full details",
                            },
                        },
                        projects: {
                            filters: ["ownedOnly", "includeTasks"],
                            formats: {
                                CSV: "Comma-separated values for spreadsheet import",
                                JSON: "Structured data format with full details",
                            },
                        },
                    },
                },
            });
        });
    });

    describe("exportUserDataBackup", () => {
        it("should export complete user data backup", async () => {
            const mockTasks = [{ id: 1, title: "Test Task" }];
            const mockProjects = [{ id: 1, name: "Test Project" }];
            const mockCategories = [{ id: 1, name: "Test Category" }];
            const mockTags = [{ id: 1, name: "Test Tag" }];
            const mockNotifications = [{ id: 1, content: "Test Notification" }];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);
            mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);
            mockPrismaClient.category.findMany.mockResolvedValue(
                mockCategories,
            );
            mockPrismaClient.tag.findMany.mockResolvedValue(mockTags);
            mockPrismaClient.notification.findMany.mockResolvedValue(
                mockNotifications,
            );

            await exportUserDataBackup(req, res);

            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Type",
                "application/json",
            );
            expect(res.setHeader).toHaveBeenCalledWith(
                "Content-Disposition",
                expect.stringContaining(
                    'attachment; filename="user_data_backup_1_',
                ),
            );

            expect(res.json).toHaveBeenCalledWith({
                backupInfo: {
                    exportedAt: expect.any(String),
                    userId: 1,
                    userAuthId: 1,
                    version: "1.0",
                },
                userData: {
                    tasks: mockTasks,
                    projects: mockProjects,
                    categories: mockCategories,
                    tags: mockTags,
                    notifications: mockNotifications,
                },
                statistics: {
                    totalTasks: 1,
                    totalProjects: 1,
                    totalCategories: 1,
                    totalTags: 1,
                    totalNotifications: 1,
                },
            });

            // Check that notifications are limited to last 100
            expect(mockPrismaClient.notification.findMany).toHaveBeenCalledWith(
                {
                    where: { userId: 1 },
                    take: 100,
                    orderBy: { createdAt: "desc" },
                },
            );
        });
    });

    describe("Error Handling", () => {
        it("should handle errors in exportTasksToCSV", async () => {
            mockPrismaClient.task.findMany.mockRejectedValue(
                new Error("Database error"),
            );

            await exportTasksToCSV(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error",
            });
        });

        it("should handle errors in exportTasksToJSON", async () => {
            mockPrismaClient.task.findMany.mockRejectedValue(
                new Error("Database error"),
            );

            await exportTasksToJSON(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error",
            });
        });

        it("should handle errors in exportProjectsToCSV", async () => {
            mockPrismaClient.project.findMany.mockRejectedValue(
                new Error("Database error"),
            );

            await exportProjectsToCSV(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error",
            });
        });

        it("should handle errors in exportProjectsToJSON", async () => {
            mockPrismaClient.project.findMany.mockRejectedValue(
                new Error("Database error"),
            );

            await exportProjectsToJSON(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error",
            });
        });

        it("should handle errors in getExportInfo", async () => {
            mockPrismaClient.task.count.mockRejectedValue(
                new Error("Database error"),
            );

            await getExportInfo(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error",
            });
        });

        it("should handle errors in exportUserDataBackup", async () => {
            mockPrismaClient.task.findMany.mockRejectedValue(
                new Error("Database error"),
            );

            await exportUserDataBackup(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error",
            });
        });
    });

    describe("Date Formatting", () => {
        it("should format dates correctly in CSV", async () => {
            const testDate = new Date("2025-06-01T10:30:45.123Z");
            const mockTasks = [
                {
                    id: 1,
                    title: "Test Task",
                    description: "Test Description",
                    status: "TODO",
                    priority: "HIGH",
                    dueDate: testDate,
                    createdAt: testDate,
                    updatedAt: testDate,
                    owner: { authId: 1 },
                    assignee: null,
                    project: null,
                    categories: [],
                    tags: [],
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);

            await exportTasksToCSV(req, res);

            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining("2025-06-01"), // Due date should be formatted as date only
            );
            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining("2025-06-01T10:30:45.123Z"), // Created/updated should be full ISO string
            );
        });
    });
});
