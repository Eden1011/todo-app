jest.mock("@prisma/client");

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    task: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
    },
    project: {
        count: jest.fn(),
        findMany: jest.fn(),
    },
    category: {
        count: jest.fn(),
    },
    tag: {
        count: jest.fn(),
    },
    $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(
    () => mockPrismaClient,
);

const {
    getOrCreateUser,
    getUserProfile,
    getUserActivity,
    searchUsers,
    deleteUser,
} = require("../../controllers/user/user.controller");

describe("User Controller", () => {
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
        };
    });

    describe("getOrCreateUser", () => {
        it("should return existing user", async () => {
            const existingUser = {
                id: 1,
                authId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaClient.user.findUnique.mockResolvedValue(existingUser);

            const result = await getOrCreateUser(1);

            expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
                where: { authId: 1 },
            });
            expect(result).toEqual(existingUser);
        });

        it("should create new user if not exists", async () => {
            const newUser = {
                id: 2,
                authId: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaClient.user.findUnique.mockResolvedValue(null);
            mockPrismaClient.user.create.mockResolvedValue(newUser);

            const result = await getOrCreateUser(2);

            expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
                where: { authId: 2 },
            });
            expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
                data: { authId: 2 },
            });
            expect(result).toEqual(newUser);
        });

        it("should throw error on database failure", async () => {
            mockPrismaClient.user.findUnique.mockRejectedValue(
                new Error("Database error"),
            );

            await expect(getOrCreateUser(1)).rejects.toThrow(
                "Failed to get or create user: Database error",
            );
        });
    });

    describe("getUserProfile", () => {
        it("should return user profile with statistics", async () => {
            const user = {
                id: 1,
                authId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaClient.user.findUnique.mockResolvedValue(user);
            mockPrismaClient.task.count
                .mockResolvedValueOnce(5) // owned tasks
                .mockResolvedValueOnce(2); // assigned tasks
            mockPrismaClient.project.count.mockResolvedValue(3);
            mockPrismaClient.category.count.mockResolvedValue(4);
            mockPrismaClient.tag.count.mockResolvedValue(6);
            mockPrismaClient.task.groupBy.mockResolvedValue([
                { status: "TODO", _count: { id: 2 } },
                { status: "IN_PROGRESS", _count: { id: 1 } },
                { status: "DONE", _count: { id: 2 } },
            ]);

            await getUserProfile(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    user: {
                        id: 1,
                        authId: 1,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                    statistics: {
                        ownedTasks: 5,
                        assignedTasks: 2,
                        projects: 3,
                        categories: 4,
                        tags: 6,
                        tasksByStatus: {
                            TODO: 2,
                            IN_PROGRESS: 1,
                            DONE: 2,
                        },
                    },
                },
            });
        });

        it("should handle error and return 500", async () => {
            mockPrismaClient.user.findUnique.mockRejectedValue(
                new Error("Database error"),
            );

            await getUserProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error",
            });
        });
    });

    describe("getUserActivity", () => {
        it("should return user activity", async () => {
            const user = { id: 1, authId: 1 };
            req.query.limit = "5";

            mockPrismaClient.user.findUnique.mockResolvedValue(user);
            mockPrismaClient.task.findMany.mockResolvedValue([
                {
                    id: 1,
                    title: "Test Task",
                    updatedAt: new Date(),
                    owner: { id: 1, authId: 1 },
                    assignee: null,
                    project: { id: 1, name: "Test Project" },
                },
            ]);
            mockPrismaClient.project.findMany.mockResolvedValue([
                {
                    id: 1,
                    name: "Test Project",
                    updatedAt: new Date(),
                    owner: { id: 1, authId: 1 },
                    _count: { tasks: 1, members: 1 },
                },
            ]);

            await getUserActivity(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    recentTasks: expect.any(Array),
                    recentProjects: expect.any(Array),
                },
            });
        });
    });

    describe("searchUsers", () => {
        it("should search users successfully", async () => {
            req.query.query = "test";
            const users = [
                { id: 2, authId: 2, createdAt: new Date() },
                { id: 3, authId: 3, createdAt: new Date() },
            ];

            mockPrismaClient.user.findUnique.mockResolvedValue({
                id: 1,
                authId: 1,
            });
            mockPrismaClient.user.findMany.mockResolvedValue(users);

            await searchUsers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: users,
            });
        });

        it("should return 400 for short query", async () => {
            req.query.query = "a";

            await searchUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Search query must be at least 2 characters long",
            });
        });
    });

    describe("deleteUser", () => {
        it("should delete user successfully", async () => {
            const user = { id: 1, authId: 1 };

            mockPrismaClient.user.findUnique.mockResolvedValue(user);
            mockPrismaClient.user.delete.mockResolvedValue(user);

            await deleteUser(req, res);

            expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    message:
                        "User account and all associated data deleted successfully",
                },
            });
        });

        it("should return 404 if user not found", async () => {
            mockPrismaClient.user.findUnique.mockResolvedValue(null);

            await deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "User not found",
            });
        });
    });
});
