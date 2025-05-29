jest.mock("@prisma/client");

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

const {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask,
} = require("../../controllers/task/task.general.controller");

describe("Task Controller", () => {
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

    describe("createTask", () => {
        it("should create task successfully", async () => {
            req.body = {
                title: "Test Task",
                description: "Test Description",
                priority: "HIGH",
                status: "TODO",
                projectId: 1,
                categoryIds: [1],
                tagIds: [1],
            };

            const mockProject = { id: 1, ownerId: 1 };
            const mockTask = {
                id: 1,
                title: "Test Task",
                description: "Test Description",
                priority: "HIGH",
                status: "TODO",
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
            };

            mockPrismaClient.project.findFirst.mockResolvedValue(mockProject);
            mockPrismaClient.task.create.mockResolvedValue(mockTask);

            await createTask(req, res);

            expect(mockPrismaClient.task.create).toHaveBeenCalledWith({
                data: {
                    title: "Test Task",
                    description: "Test Description",
                    priority: "HIGH",
                    status: "TODO",
                    dueDate: null,
                    ownerId: 1,
                    assigneeId: null,
                    projectId: 1,
                    categories: {
                        create: [{ category: { connect: { id: 1 } } }],
                    },
                    tags: {
                        create: [{ tag: { connect: { id: 1 } } }],
                    },
                },
                include: expect.any(Object),
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockTask,
            });
        });

        it("should return 400 if title is missing", async () => {
            req.body = { description: "Test Description" };

            await createTask(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Title is required",
            });
        });

        it("should return 403 if user doesn't have access to project", async () => {
            req.body = {
                title: "Test Task",
                projectId: 1,
            };

            mockPrismaClient.project.findFirst.mockResolvedValue(null);

            await createTask(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "You don't have access to this project",
            });
        });
    });

    describe("getTasks", () => {
        it("should get tasks with default parameters", async () => {
            const mockTasks = [
                {
                    id: 1,
                    title: "Test Task",
                    description: "Test Description",
                    priority: "HIGH",
                    status: "TODO",
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
                },
            ];

            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);
            mockPrismaClient.task.count.mockResolvedValue(1);

            await getTasks(req, res);

            expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [{ ownerId: 1 }, { assigneeId: 1 }],
                },
                skip: 0,
                take: 20,
                orderBy: { updatedAt: "desc" },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    tasks: mockTasks,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 1,
                        totalPages: 1,
                    },
                },
            });
        });

        it("should apply filters correctly", async () => {
            req.query = {
                status: "TODO",
                priority: "HIGH",
                search: "test",
                page: "2",
                limit: "10",
            };

            mockPrismaClient.task.findMany.mockResolvedValue([]);
            mockPrismaClient.task.count.mockResolvedValue(0);

            await getTasks(req, res);

            expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { title: { contains: "test" } },
                        { description: { contains: "test" } },
                    ],
                    status: "TODO",
                    priority: "HIGH",
                },
                skip: 10,
                take: 10,
                orderBy: { updatedAt: "desc" },
                include: expect.any(Object),
            });
        });
    });

    describe("getTaskById", () => {
        it("should return task by id", async () => {
            req.params.id = "1";
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

            await getTaskById(req, res);

            expect(mockPrismaClient.task.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    OR: [{ ownerId: 1 }, { assigneeId: 1 }],
                },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockTask,
            });
        });

        it("should return 404 if task not found", async () => {
            req.params.id = "999";
            mockPrismaClient.task.findFirst.mockResolvedValue(null);

            await getTaskById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        });
    });

    describe("updateTask", () => {
        it("should update task successfully", async () => {
            req.params.id = "1";
            req.body = {
                title: "Updated Task",
                description: "Updated Description",
                status: "IN_PROGRESS",
            };

            const existingTask = { id: 1, ownerId: 1, assigneeId: null };
            const updatedTask = {
                id: 1,
                title: "Updated Task",
                description: "Updated Description",
                status: "IN_PROGRESS",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                assignee: null,
                project: null,
                categories: [],
                tags: [],
            };

            mockPrismaClient.task.findFirst.mockResolvedValue(existingTask);
            mockPrismaClient.task.update.mockResolvedValue(updatedTask);

            await updateTask(req, res);

            expect(mockPrismaClient.task.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    title: "Updated Task",
                    description: "Updated Description",
                    status: "IN_PROGRESS",
                },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: updatedTask,
            });
        });

        it("should only allow owner to update priority", async () => {
            req.params.id = "1";
            req.body = { priority: "URGENT" };

            const existingTask = { id: 1, ownerId: 2, assigneeId: 1 }; // User is assignee, not owner
            mockPrismaClient.task.findFirst.mockResolvedValue(existingTask);

            const updatedTask = { id: 1, ownerId: 2, assigneeId: 1 };
            mockPrismaClient.task.update.mockResolvedValue(updatedTask);

            await updateTask(req, res);

            expect(mockPrismaClient.task.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {}, // Priority should not be in data since user is not owner
                include: expect.any(Object),
            });
        });
    });

    describe("deleteTask", () => {
        it("should delete task successfully", async () => {
            req.params.id = "1";
            const mockTask = { id: 1, ownerId: 1 };

            mockPrismaClient.task.findFirst.mockResolvedValue(mockTask);
            mockPrismaClient.task.delete.mockResolvedValue(mockTask);

            await deleteTask(req, res);

            expect(mockPrismaClient.task.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "Task deleted successfully" },
            });
        });

        it("should return 404 if user doesn't own task", async () => {
            req.params.id = "1";
            mockPrismaClient.task.findFirst.mockResolvedValue(null);

            await deleteTask(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Task not found or you don't have permission to delete it",
            });
        });
    });

    describe("assignTask", () => {
        it("should assign task successfully", async () => {
            req.params.id = "1";
            req.body = { assigneeAuthId: 2 };

            const mockTask = { id: 1, ownerId: 1 };
            const mockAssignee = { id: 2, authId: 2 };
            const updatedTask = {
                id: 1,
                ownerId: 1,
                assigneeId: 2,
                owner: { id: 1, authId: 1 },
                assignee: { id: 2, authId: 2 },
                project: null,
            };

            mockPrismaClient.task.findFirst.mockResolvedValue(mockTask);
            mockPrismaClient.user.findUnique.mockResolvedValueOnce({
                id: 1,
                authId: 1,
            }); // Current user
            mockPrismaClient.user.findUnique.mockResolvedValueOnce(null); // Assignee not found
            mockPrismaClient.user.create.mockResolvedValue(mockAssignee); // Create assignee
            mockPrismaClient.task.update.mockResolvedValue(updatedTask);

            await assignTask(req, res);

            expect(mockPrismaClient.task.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { assigneeId: 2 },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: updatedTask,
            });
        });

        it("should unassign task when assigneeAuthId is null", async () => {
            req.params.id = "1";
            req.body = { assigneeAuthId: null };

            const mockTask = { id: 1, ownerId: 1 };
            const updatedTask = { id: 1, ownerId: 1, assigneeId: null };

            mockPrismaClient.task.findFirst.mockResolvedValue(mockTask);
            mockPrismaClient.task.update.mockResolvedValue(updatedTask);

            await assignTask(req, res);

            expect(mockPrismaClient.task.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { assigneeId: null },
                include: expect.any(Object),
            });
        });
    });
});
