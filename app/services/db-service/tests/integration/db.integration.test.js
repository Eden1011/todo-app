jest.mock("@prisma/client");
jest.mock("axios");

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
    },
    task: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        deleteMany: jest.fn(),
    },
    category: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
    },
    tag: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
    },
    project: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
    },
    projectMember: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
    },
    categoryOnTask: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
    },
    tagOnTask: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
    },
    notification: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
        groupBy: jest.fn(),
    },
    $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(
    () => mockPrismaClient,
);

const request = require("supertest");
const axios = require("axios");
const app = require("../server.js");

describe("DB Service Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaClient.$transaction.mockImplementation(async (callback) =>
            callback(mockPrismaClient),
        );

        // Mock successful auth service response
        axios.post.mockResolvedValue({
            data: {
                success: true,
                data: {
                    valid: true,
                    user: { id: 1 },
                },
            },
        });

        axios.get.mockResolvedValue({
            status: 200,
            data: {
                status: "ok",
                service: "auth-service",
            },
        });
    });

    describe("Complete Task Management Flow", () => {
        it("should complete the full task management flow", async () => {
            const authToken = "Bearer test-token";

            // Mock user creation/retrieval
            mockPrismaClient.user.findUnique.mockResolvedValue(null);
            mockPrismaClient.user.create.mockResolvedValue({
                id: 1,
                authId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Test 1: Create a category
            mockPrismaClient.category.findFirst.mockResolvedValue(null);
            mockPrismaClient.category.create.mockResolvedValue({
                id: 1,
                name: "Work",
                color: "#FF5733",
                ownerId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                _count: { tasks: 0 },
            });

            const categoryResponse = await request(app)
                .post("/api/category")
                .set("Authorization", authToken)
                .send({ name: "Work", color: "#FF5733" });

            expect(categoryResponse.status).toBe(201);
            expect(categoryResponse.body.success).toBe(true);
            expect(categoryResponse.body.data.name).toBe("Work");

            // Test 2: Create a tag
            mockPrismaClient.tag.findFirst.mockResolvedValue(null);
            mockPrismaClient.tag.create.mockResolvedValue({
                id: 1,
                name: "urgent",
                color: "#FF0000",
                ownerId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                _count: { tasks: 0 },
            });

            const tagResponse = await request(app)
                .post("/api/tag")
                .set("Authorization", authToken)
                .send({ name: "urgent", color: "#FF0000" });

            expect(tagResponse.status).toBe(201);
            expect(tagResponse.body.success).toBe(true);
            expect(tagResponse.body.data.name).toBe("urgent");

            // Test 3: Create a project
            mockPrismaClient.project.create.mockResolvedValue({
                id: 1,
                name: "Test Project",
                description: "A test project",
                ownerId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                members: [
                    {
                        id: 1,
                        projectId: 1,
                        userId: 1,
                        role: "OWNER",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        user: { id: 1, authId: 1 },
                    },
                ],
                _count: { tasks: 0, members: 1 },
            });

            const projectResponse = await request(app)
                .post("/api/project")
                .set("Authorization", authToken)
                .send({ name: "Test Project", description: "A test project" });

            expect(projectResponse.status).toBe(201);
            expect(projectResponse.body.success).toBe(true);
            expect(projectResponse.body.data.name).toBe("Test Project");

            // Test 4: Create a task with relationships
            mockPrismaClient.project.findFirst.mockResolvedValue({
                id: 1,
                ownerId: 1,
            });

            mockPrismaClient.task.create.mockResolvedValue({
                id: 1,
                title: "Complete documentation",
                description: "Write comprehensive documentation",
                priority: "HIGH",
                status: "TODO",
                dueDate: new Date("2025-06-01T10:00:00.000Z"),
                ownerId: 1,
                assigneeId: null,
                projectId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                assignee: null,
                project: { id: 1, name: "Test Project" },
                categories: [{ category: { id: 1, name: "Work" } }],
                tags: [{ tag: { id: 1, name: "urgent" } }],
            });

            const taskResponse = await request(app)
                .post("/api/task")
                .set("Authorization", authToken)
                .send({
                    title: "Complete documentation",
                    description: "Write comprehensive documentation",
                    priority: "HIGH",
                    status: "TODO",
                    dueDate: "2025-06-01T10:00:00.000Z",
                    projectId: 1,
                    categoryIds: [1],
                    tagIds: [1],
                });

            expect(taskResponse.status).toBe(201);
            expect(taskResponse.body.success).toBe(true);
            expect(taskResponse.body.data.title).toBe("Complete documentation");

            // Test 5: Get tasks with filtering
            mockPrismaClient.task.findMany.mockResolvedValue([
                {
                    id: 1,
                    title: "Complete documentation",
                    description: "Write comprehensive documentation",
                    priority: "HIGH",
                    status: "TODO",
                    dueDate: new Date("2025-06-01T10:00:00.000Z"),
                    ownerId: 1,
                    assigneeId: null,
                    projectId: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    owner: { id: 1, authId: 1 },
                    assignee: null,
                    project: { id: 1, name: "Test Project" },
                    categories: [{ category: { id: 1, name: "Work" } }],
                    tags: [{ tag: { id: 1, name: "urgent" } }],
                },
            ]);

            mockPrismaClient.task.count.mockResolvedValue(1);

            const getTasksResponse = await request(app)
                .get("/api/task?status=TODO&priority=HIGH")
                .set("Authorization", authToken);

            expect(getTasksResponse.status).toBe(200);
            expect(getTasksResponse.body.success).toBe(true);
            expect(getTasksResponse.body.data.tasks).toHaveLength(1);

            // Test 6: Update task status
            mockPrismaClient.task.findFirst.mockResolvedValue({
                id: 1,
                ownerId: 1,
                assigneeId: null,
                owner: { id: 1, authId: 1 },
                assignee: null,
            });

            mockPrismaClient.task.update.mockResolvedValue({
                id: 1,
                title: "Complete documentation",
                description: "Write comprehensive documentation",
                priority: "HIGH",
                status: "IN_PROGRESS",
                dueDate: new Date("2025-06-01T10:00:00.000Z"),
                ownerId: 1,
                assigneeId: null,
                projectId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                assignee: null,
                project: { id: 1, name: "Test Project" },
            });

            const updateStatusResponse = await request(app)
                .put("/api/task/1/status")
                .set("Authorization", authToken)
                .send({ status: "IN_PROGRESS" });

            expect(updateStatusResponse.status).toBe(200);
            expect(updateStatusResponse.body.success).toBe(true);
            expect(updateStatusResponse.body.data.status).toBe("IN_PROGRESS");

            // Test 7: Get user profile with statistics
            mockPrismaClient.task.count
                .mockResolvedValueOnce(1) // ownedTasks
                .mockResolvedValueOnce(0); // assignedTasks

            mockPrismaClient.project.count.mockResolvedValue(1);
            mockPrismaClient.category.count.mockResolvedValue(1);
            mockPrismaClient.tag.count.mockResolvedValue(1);
            mockPrismaClient.task.groupBy.mockResolvedValue([
                { status: "IN_PROGRESS", _count: { id: 1 } },
            ]);

            const profileResponse = await request(app)
                .get("/api/user/profile")
                .set("Authorization", authToken);

            expect(profileResponse.status).toBe(200);
            expect(profileResponse.body.success).toBe(true);
            expect(profileResponse.body.data.user.authId).toBe(1);
            expect(profileResponse.body.data.statistics.ownedTasks).toBe(1);
        });
    });

    describe("Error Handling", () => {
        it("should handle authentication failure", async () => {
            axios.post.mockRejectedValue(new Error("Auth service unavailable"));

            const response = await request(app)
                .get("/api/task")
                .set("Authorization", "Bearer invalid-token");

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });

        it("should handle invalid task creation", async () => {
            const response = await request(app)
                .post("/api/task")
                .set("Authorization", "Bearer test-token")
                .send({ description: "Task without title" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should handle task not found", async () => {
            mockPrismaClient.user.findUnique.mockResolvedValue({
                id: 1,
                authId: 1,
            });

            mockPrismaClient.task.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .get("/api/task/999")
                .set("Authorization", "Bearer test-token");

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe(
                "Task not found or you don't have access to it",
            );
        });
    });

    describe("Notification System", () => {
        it("should create and manage notifications", async () => {
            mockPrismaClient.user.findUnique.mockResolvedValue({
                id: 1,
                authId: 1,
            });

            mockPrismaClient.notification.findMany.mockResolvedValue([
                {
                    id: 1,
                    type: "DUE_DATE_REMINDER",
                    content: "Task is due soon",
                    isRead: false,
                    userId: 1,
                    relatedTaskId: 1,
                    createdAt: new Date(),
                    relatedTask: {
                        id: 1,
                        title: "Complete documentation",
                        status: "TODO",
                    },
                },
            ]);

            mockPrismaClient.notification.count
                .mockResolvedValueOnce(1) // total
                .mockResolvedValueOnce(1); // unread

            const notificationsResponse = await request(app)
                .get("/api/notification")
                .set("Authorization", "Bearer test-token");

            expect(notificationsResponse.status).toBe(200);
            expect(notificationsResponse.body.success).toBe(true);
            expect(notificationsResponse.body.data.notifications).toHaveLength(
                1,
            );
            expect(notificationsResponse.body.data.unreadCount).toBe(1);
        });
    });

    describe("Export Functionality", () => {
        it("should export tasks to JSON format", async () => {
            mockPrismaClient.user.findUnique.mockResolvedValue({
                id: 1,
                authId: 1,
            });

            mockPrismaClient.task.findMany.mockResolvedValue([
                {
                    id: 1,
                    title: "Test Task",
                    description: "Test Description",
                    priority: "HIGH",
                    status: "TODO",
                    dueDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ownerId: 1,
                    assigneeId: null,
                    projectId: null,
                    owner: { authId: 1 },
                    assignee: null,
                    project: null,
                    categories: [],
                    tags: [],
                },
            ]);

            const exportResponse = await request(app)
                .get("/api/export/tasks/json")
                .set("Authorization", "Bearer test-token");

            expect(exportResponse.status).toBe(200);
            expect(exportResponse.headers["content-type"]).toContain(
                "application/json",
            );
            expect(exportResponse.body.exportInfo).toBeDefined();
            expect(exportResponse.body.tasks).toHaveLength(1);
        });
    });
});
