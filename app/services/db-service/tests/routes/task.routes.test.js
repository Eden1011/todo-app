jest.mock("@prisma/client");
jest.mock("axios");

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    task: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
    },
    project: {
        findFirst: jest.fn(),
    },
    categoryOnTask: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
    },
    tagOnTask: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
    },
    $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(
    () => mockPrismaClient,
);

const request = require("supertest");
const express = require("express");
const axios = require("axios");
const taskRoutes = require("../../routes/task.routes");
const { errorHandler } = require("../../middleware/error.handler");

// Mock the auth middleware to always pass
jest.mock("../../middleware/db.auth-token", () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1 };
        next();
    },
}));

describe("Task Routes", () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaClient.$transaction.mockImplementation(async (callback) =>
            callback(mockPrismaClient),
        );

        app = express();
        app.use(express.json());
        app.use("/api/task", taskRoutes);
        app.use(errorHandler);

        // Mock successful user retrieval
        mockPrismaClient.user.findUnique.mockResolvedValue({
            id: 1,
            authId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe("POST /api/task", () => {
        it("should create task successfully", async () => {
            const taskData = {
                title: "Test Task",
                description: "Test Description",
                priority: "HIGH",
                status: "TODO",
            };

            const mockTask = {
                id: 1,
                ...taskData,
                ownerId: 1,
                assigneeId: null,
                projectId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                assignee: null,
                project: null,
                categories: [],
                tags: [],
            };

            mockPrismaClient.task.create.mockResolvedValue(mockTask);

            const response = await request(app)
                .post("/api/task")
                .send(taskData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe("Test Task");
        });

        it("should return 400 for invalid task data", async () => {
            const response = await request(app)
                .post("/api/task")
                .send({ description: "Task without title" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should return 400 for invalid priority", async () => {
            const response = await request(app).post("/api/task").send({
                title: "Test Task",
                priority: "INVALID",
            });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/task", () => {
        it("should get tasks successfully", async () => {
            const mockTasks = [
                {
                    id: 1,
                    title: "Test Task",
                    description: "Test Description",
                    priority: "HIGH",
                    status: "TODO",
                    ownerId: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    owner: { id: 1, authId: 1 },
                    assignee: null,
                    project: null,
                    categories: [],
                    tags: [],
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);
            mockPrismaClient.task.count.mockResolvedValue(1);

            const response = await request(app).get("/api/task");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.tasks).toHaveLength(1);
            expect(response.body.data.pagination.total).toBe(1);
        });

        it("should handle query parameters", async () => {
            mockPrismaClient.task.findMany.mockResolvedValue([]);
            mockPrismaClient.task.count.mockResolvedValue(0);

            const response = await request(app).get(
                "/api/task?status=TODO&priority=HIGH&page=2&limit=5",
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should return 400 for invalid query parameters", async () => {
            const response = await request(app).get("/api/task?page=0");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/task/:id", () => {
        it("should get task by id successfully", async () => {
            const mockTask = {
                id: 1,
                title: "Test Task",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                assignee: null,
                project: null,
                categories: [],
                tags: [],
            };

            mockPrismaClient.task.findFirst.mockResolvedValue(mockTask);

            const response = await request(app).get("/api/task/1");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(1);
        });

        it("should return 404 for non-existent task", async () => {
            mockPrismaClient.task.findFirst.mockResolvedValue(null);

            const response = await request(app).get("/api/task/999");

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("should return 400 for invalid id parameter", async () => {
            const response = await request(app).get("/api/task/invalid");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("PUT /api/task/:id", () => {
        it("should update task successfully", async () => {
            const updateData = {
                title: "Updated Task",
                description: "Updated Description",
            };

            const existingTask = { id: 1, ownerId: 1, assigneeId: null };
            const updatedTask = {
                id: 1,
                title: "Updated Task",
                description: "Updated Description",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                assignee: null,
                project: null,
                categories: [],
                tags: [],
            };

            mockPrismaClient.task.findFirst.mockResolvedValue(existingTask);
            mockPrismaClient.task.update.mockResolvedValue(updatedTask);

            const response = await request(app)
                .put("/api/task/1")
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe("Updated Task");
        });

        it("should return 404 for non-existent task", async () => {
            mockPrismaClient.task.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .put("/api/task/999")
                .send({ title: "Updated Task" });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe("DELETE /api/task/:id", () => {
        it("should delete task successfully", async () => {
            const mockTask = { id: 1, ownerId: 1 };

            mockPrismaClient.task.findFirst.mockResolvedValue(mockTask);
            mockPrismaClient.task.delete.mockResolvedValue(mockTask);

            const response = await request(app).delete("/api/task/1");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe(
                "Task deleted successfully",
            );
        });

        it("should return 404 for non-existent task", async () => {
            mockPrismaClient.task.findFirst.mockResolvedValue(null);

            const response = await request(app).delete("/api/task/999");

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe("PUT /api/task/:taskId/status", () => {
        it("should update task status successfully", async () => {
            const mockTask = {
                id: 1,
                ownerId: 1,
                assigneeId: null,
                owner: { id: 1, authId: 1 },
                assignee: null,
            };

            const updatedTask = {
                ...mockTask,
                status: "IN_PROGRESS",
                project: null,
            };

            mockPrismaClient.task.findFirst.mockResolvedValue(mockTask);
            mockPrismaClient.task.update.mockResolvedValue(updatedTask);

            const response = await request(app)
                .put("/api/task/1/status")
                .send({ status: "IN_PROGRESS" });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe("IN_PROGRESS");
        });

        it("should return 400 for invalid status", async () => {
            const response = await request(app)
                .put("/api/task/1/status")
                .send({ status: "INVALID_STATUS" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/task/status/:status", () => {
        it("should get tasks by status", async () => {
            const mockTasks = [
                {
                    id: 1,
                    title: "Test Task",
                    status: "TODO",
                    ownerId: 1,
                    owner: { id: 1, authId: 1 },
                    assignee: null,
                    project: null,
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);
            mockPrismaClient.task.count.mockResolvedValue(1);

            const response = await request(app).get("/api/task/status/TODO");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe("TODO");
            expect(response.body.data.tasks).toHaveLength(1);
        });

        it("should return 400 for invalid status", async () => {
            const response = await request(app).get("/api/task/status/INVALID");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/task/statistics/status", () => {
        it("should return status statistics", async () => {
            mockPrismaClient.task.groupBy.mockResolvedValue([
                { status: "TODO", _count: { id: 2 } },
                { status: "IN_PROGRESS", _count: { id: 1 } },
                { status: "DONE", _count: { id: 3 } },
            ]);

            const response = await request(app).get(
                "/api/task/statistics/status",
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.byStatus).toBeDefined();
            expect(response.body.data.total).toBe(6);
        });
    });
});
