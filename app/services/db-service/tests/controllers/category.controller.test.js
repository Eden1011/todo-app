jest.mock("@prisma/client");

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    category: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
    },
    $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(
    () => mockPrismaClient,
);

const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCategoryStats,
    bulkDeleteCategories,
} = require("../../controllers/category/category.controller");

describe("Category Controller", () => {
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

    describe("createCategory", () => {
        it("should create category successfully", async () => {
            req.body = {
                name: "Work",
                color: "#FF5733",
            };

            const mockCategory = {
                id: 1,
                name: "Work",
                color: "#FF5733",
                ownerId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                _count: { tasks: 0 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(null);
            mockPrismaClient.category.create.mockResolvedValue(mockCategory);

            await createCategory(req, res);

            expect(mockPrismaClient.category.findFirst).toHaveBeenCalledWith({
                where: {
                    name: "Work",
                    ownerId: 1,
                },
            });

            expect(mockPrismaClient.category.create).toHaveBeenCalledWith({
                data: {
                    name: "Work",
                    color: "#FF5733",
                    ownerId: 1,
                },
                include: expect.any(Object),
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockCategory,
            });
        });

        it("should return 400 if name is missing", async () => {
            req.body = { color: "#FF5733" };

            await createCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Category name is required",
            });
        });

        it("should return 409 if category already exists", async () => {
            req.body = { name: "Work" };

            mockPrismaClient.category.findFirst.mockResolvedValue({
                id: 1,
                name: "Work",
                ownerId: 1,
            });

            await createCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Category with this name already exists",
            });
        });
    });

    describe("getCategories", () => {
        it("should get categories with default parameters", async () => {
            const mockCategories = [
                {
                    id: 1,
                    name: "Work",
                    color: "#FF5733",
                    ownerId: 1,
                    owner: { id: 1, authId: 1 },
                    _count: { tasks: 0 },
                },
            ];

            mockPrismaClient.category.findMany.mockResolvedValue(
                mockCategories,
            );
            mockPrismaClient.category.count.mockResolvedValue(1);

            await getCategories(req, res);

            expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith({
                where: { ownerId: 1 },
                skip: 0,
                take: 50,
                orderBy: { name: "asc" },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    categories: mockCategories,
                    pagination: {
                        page: 1,
                        limit: 50,
                        total: 1,
                        totalPages: 1,
                    },
                },
            });
        });

        it("should apply search filter", async () => {
            req.query = { search: "work" };

            mockPrismaClient.category.findMany.mockResolvedValue([]);
            mockPrismaClient.category.count.mockResolvedValue(0);

            await getCategories(req, res);

            expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith({
                where: {
                    ownerId: 1,
                    name: { contains: "work" },
                },
                skip: 0,
                take: 50,
                orderBy: { name: "asc" },
                include: expect.any(Object),
            });
        });

        it("should handle withTaskCount parameter", async () => {
            req.query = { withTaskCount: "false" };

            mockPrismaClient.category.findMany.mockResolvedValue([]);
            mockPrismaClient.category.count.mockResolvedValue(0);

            await getCategories(req, res);

            expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith({
                where: { ownerId: 1 },
                skip: 0,
                take: 50,
                orderBy: { name: "asc" },
                include: {
                    owner: { select: { id: true, authId: true } },
                },
            });
        });
    });

    describe("getCategoryById", () => {
        it("should return category by id", async () => {
            req.params.id = "1";
            const mockCategory = {
                id: 1,
                name: "Work",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                tasks: [],
                _count: { tasks: 0 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);

            await getCategoryById(req, res);

            expect(mockPrismaClient.category.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    ownerId: 1,
                },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockCategory,
            });
        });

        it("should return 404 if category not found", async () => {
            req.params.id = "999";
            mockPrismaClient.category.findFirst.mockResolvedValue(null);

            await getCategoryById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Category not found",
            });
        });
    });

    describe("updateCategory", () => {
        it("should update category successfully", async () => {
            req.params.id = "1";
            req.body = {
                name: "Updated Work",
                color: "#FF0000",
            };

            const existingCategory = { id: 1, name: "Work", ownerId: 1 };
            const updatedCategory = {
                id: 1,
                name: "Updated Work",
                color: "#FF0000",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                _count: { tasks: 0 },
            };

            mockPrismaClient.category.findFirst
                .mockResolvedValueOnce(existingCategory) // First call to check if exists
                .mockResolvedValueOnce(null); // Second call to check for conflicts

            mockPrismaClient.category.update.mockResolvedValue(updatedCategory);

            await updateCategory(req, res);

            expect(mockPrismaClient.category.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    name: "Updated Work",
                    color: "#FF0000",
                },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: updatedCategory,
            });
        });

        it("should return 404 if category not found", async () => {
            req.params.id = "999";
            req.body = { name: "Updated Work" };

            mockPrismaClient.category.findFirst.mockResolvedValue(null);

            await updateCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Category not found",
            });
        });

        it("should return 409 if new name conflicts", async () => {
            req.params.id = "1";
            req.body = { name: "Existing Category" };

            const existingCategory = { id: 1, name: "Work", ownerId: 1 };
            const conflictingCategory = {
                id: 2,
                name: "Existing Category",
                ownerId: 1,
            };

            mockPrismaClient.category.findFirst
                .mockResolvedValueOnce(existingCategory)
                .mockResolvedValueOnce(conflictingCategory);

            await updateCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Category with this name already exists",
            });
        });
    });

    describe("deleteCategory", () => {
        it("should delete category successfully", async () => {
            req.params.id = "1";
            const mockCategory = {
                id: 1,
                name: "Work",
                ownerId: 1,
                _count: { tasks: 0 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
            mockPrismaClient.category.delete.mockResolvedValue(mockCategory);

            await deleteCategory(req, res);

            expect(mockPrismaClient.category.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "Category deleted successfully" },
            });
        });

        it("should return 400 if category has tasks", async () => {
            req.params.id = "1";
            const mockCategory = {
                id: 1,
                name: "Work",
                ownerId: 1,
                _count: { tasks: 5 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);

            await deleteCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Cannot delete category with 5 associated tasks. Remove tasks from category first.",
            });
        });
    });

    describe("getCategoryStats", () => {
        it("should return category statistics", async () => {
            const mockStats = [
                {
                    id: 1,
                    name: "Work",
                    color: "#FF5733",
                    _count: { tasks: 3 },
                    tasks: [
                        { task: { status: "TODO" } },
                        { task: { status: "TODO" } },
                        { task: { status: "DONE" } },
                    ],
                },
            ];

            mockPrismaClient.category.findMany.mockResolvedValue(mockStats);

            await getCategoryStats(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: [
                    {
                        id: 1,
                        name: "Work",
                        color: "#FF5733",
                        totalTasks: 3,
                        tasksByStatus: {
                            TODO: 2,
                            DONE: 1,
                        },
                    },
                ],
            });
        });
    });

    describe("bulkDeleteCategories", () => {
        it("should bulk delete categories successfully", async () => {
            req.body = { categoryIds: [1, 2] };

            const mockCategories = [
                { id: 1, name: "Work", ownerId: 1, _count: { tasks: 0 } },
                { id: 2, name: "Personal", ownerId: 1, _count: { tasks: 0 } },
            ];

            mockPrismaClient.category.findMany.mockResolvedValue(
                mockCategories,
            );
            mockPrismaClient.category.deleteMany.mockResolvedValue({
                count: 2,
            });

            await bulkDeleteCategories(req, res);

            expect(mockPrismaClient.category.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: { in: [1, 2] },
                    ownerId: 1,
                },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "2 categories deleted successfully" },
            });
        });

        it("should return 400 for invalid input", async () => {
            req.body = { categoryIds: "not-an-array" };

            await bulkDeleteCategories(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Category IDs array is required",
            });
        });

        it("should return 400 if some categories have tasks", async () => {
            req.body = { categoryIds: [1, 2] };

            const mockCategories = [
                { id: 1, name: "Work", ownerId: 1, _count: { tasks: 5 } },
                { id: 2, name: "Personal", ownerId: 1, _count: { tasks: 0 } },
            ];

            mockPrismaClient.category.findMany.mockResolvedValue(
                mockCategories,
            );

            await bulkDeleteCategories(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Cannot delete categories with tasks: Work",
            });
        });
    });
});
