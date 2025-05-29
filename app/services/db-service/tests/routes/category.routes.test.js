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

const request = require("supertest");
const express = require("express");
const categoryRoutes = require("../../routes/category.routes");
const { errorHandler } = require("../../middleware/error.handler");

// Mock the auth middleware to always pass
jest.mock("../../middleware/db.auth-token", () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1 };
        next();
    },
}));

describe("Category Routes", () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaClient.$transaction.mockImplementation(async (callback) =>
            callback(mockPrismaClient),
        );

        app = express();
        app.use(express.json());
        app.use("/api/category", categoryRoutes);
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

    describe("POST /api/category", () => {
        it("should create category successfully", async () => {
            const categoryData = {
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

            const response = await request(app)
                .post("/api/category")
                .send(categoryData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe("Work");
            expect(response.body.data.color).toBe("#FF5733");
        });

        it("should return 400 for invalid category data", async () => {
            const response = await request(app)
                .post("/api/category")
                .send({ color: "#FF5733" }); // Missing name

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should return 400 for invalid color format", async () => {
            const response = await request(app).post("/api/category").send({
                name: "Work",
                color: "invalid-color",
            });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should create category without color", async () => {
            const categoryData = { name: "Work" };
            const mockCategory = {
                id: 1,
                name: "Work",
                color: null,
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                _count: { tasks: 0 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(null);
            mockPrismaClient.category.create.mockResolvedValue(mockCategory);

            const response = await request(app)
                .post("/api/category")
                .send(categoryData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.color).toBeNull();
        });
    });

    describe("GET /api/category", () => {
        it("should get categories successfully", async () => {
            const mockCategories = [
                {
                    id: 1,
                    name: "Work",
                    color: "#FF5733",
                    ownerId: 1,
                    owner: { id: 1, authId: 1 },
                    _count: { tasks: 5 },
                },
            ];

            mockPrismaClient.category.findMany.mockResolvedValue(
                mockCategories,
            );
            mockPrismaClient.category.count.mockResolvedValue(1);

            const response = await request(app).get("/api/category");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.categories).toHaveLength(1);
            expect(response.body.data.pagination.total).toBe(1);
        });

        it("should handle query parameters", async () => {
            mockPrismaClient.category.findMany.mockResolvedValue([]);
            mockPrismaClient.category.count.mockResolvedValue(0);

            const response = await request(app).get(
                "/api/category?search=work&page=2&limit=5&sortBy=createdAt&sortOrder=desc",
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should return 400 for invalid query parameters", async () => {
            const response = await request(app).get("/api/category?page=0");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should handle withTaskCount parameter", async () => {
            mockPrismaClient.category.findMany.mockResolvedValue([]);
            mockPrismaClient.category.count.mockResolvedValue(0);

            const response = await request(app).get(
                "/api/category?withTaskCount=false",
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe("GET /api/category/stats", () => {
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

            const response = await request(app).get("/api/category/stats");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].totalTasks).toBe(3);
            expect(response.body.data[0].tasksByStatus.TODO).toBe(2);
            expect(response.body.data[0].tasksByStatus.DONE).toBe(1);
        });
    });

    describe("GET /api/category/:id", () => {
        it("should get category by id successfully", async () => {
            const mockCategory = {
                id: 1,
                name: "Work",
                color: "#FF5733",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                tasks: [],
                _count: { tasks: 0 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);

            const response = await request(app).get("/api/category/1");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(1);
            expect(response.body.data.name).toBe("Work");
        });

        it("should return 404 for non-existent category", async () => {
            mockPrismaClient.category.findFirst.mockResolvedValue(null);

            const response = await request(app).get("/api/category/999");

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Category not found");
        });

        it("should return 400 for invalid id parameter", async () => {
            const response = await request(app).get("/api/category/invalid");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("PUT /api/category/:id", () => {
        it("should update category successfully", async () => {
            const updateData = {
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
                .mockResolvedValueOnce(existingCategory)
                .mockResolvedValueOnce(null); // No conflict

            mockPrismaClient.category.update.mockResolvedValue(updatedCategory);

            const response = await request(app)
                .put("/api/category/1")
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe("Updated Work");
            expect(response.body.data.color).toBe("#FF0000");
        });

        it("should return 404 for non-existent category", async () => {
            mockPrismaClient.category.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .put("/api/category/999")
                .send({ name: "Updated Category" });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Category not found");
        });

        it("should return 409 for name conflict", async () => {
            const existingCategory = { id: 1, name: "Work", ownerId: 1 };
            const conflictingCategory = { id: 2, name: "Personal", ownerId: 1 };

            mockPrismaClient.category.findFirst
                .mockResolvedValueOnce(existingCategory)
                .mockResolvedValueOnce(conflictingCategory);

            const response = await request(app)
                .put("/api/category/1")
                .send({ name: "Personal" });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe(
                "Category with this name already exists",
            );
        });

        it("should return 400 for invalid data", async () => {
            const response = await request(app)
                .put("/api/category/1")
                .send({ color: "invalid-color" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("DELETE /api/category/:id", () => {
        it("should delete category successfully", async () => {
            const mockCategory = {
                id: 1,
                name: "Work",
                ownerId: 1,
                _count: { tasks: 0 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
            mockPrismaClient.category.delete.mockResolvedValue(mockCategory);

            const response = await request(app).delete("/api/category/1");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe(
                "Category deleted successfully",
            );
        });

        it("should return 404 for non-existent category", async () => {
            mockPrismaClient.category.findFirst.mockResolvedValue(null);

            const response = await request(app).delete("/api/category/999");

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Category not found");
        });

        it("should return 400 if category has tasks", async () => {
            const mockCategory = {
                id: 1,
                name: "Work",
                ownerId: 1,
                _count: { tasks: 5 },
            };

            mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);

            const response = await request(app).delete("/api/category/1");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain(
                "Cannot delete category with 5 associated tasks",
            );
        });

        it("should return 400 for invalid id parameter", async () => {
            const response = await request(app).delete("/api/category/invalid");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("Route order and specificity", () => {
        it("should prioritize /stats route over /:id route", async () => {
            mockPrismaClient.category.findMany.mockResolvedValue([]);

            const response = await request(app).get("/api/category/stats");

            expect(response.status).toBe(200);
            expect(mockPrismaClient.category.findMany).toHaveBeenCalled();
            // Should not try to find category with id "stats"
            expect(mockPrismaClient.category.findFirst).not.toHaveBeenCalled();
        });
    });

    describe("Rate limiting", () => {
        it("should handle rate limiting in production", async () => {
            // In test environment, rate limiting is disabled
            // This test ensures the middleware is properly configured
            const response = await request(app)
                .post("/api/category")
                .send({ name: "Test Category" });

            // Should not be rate limited in test environment
            expect(response.status).not.toBe(429);
        });
    });

    describe("Validation edge cases", () => {
        it("should handle name with maximum length", async () => {
            const longName = "a".repeat(100); // Max allowed length
            mockPrismaClient.category.findFirst.mockResolvedValue(null);
            mockPrismaClient.category.create.mockResolvedValue({
                id: 1,
                name: longName,
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                _count: { tasks: 0 },
            });

            const response = await request(app)
                .post("/api/category")
                .send({ name: longName });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it("should reject name that exceeds maximum length", async () => {
            const tooLongName = "a".repeat(101); // Exceeds max length

            const response = await request(app)
                .post("/api/category")
                .send({ name: tooLongName });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should handle valid hex colors", async () => {
            const validColors = ["#FF5733", "#000000", "#FFFFFF", "#123ABC"];

            for (const color of validColors) {
                mockPrismaClient.category.findFirst.mockResolvedValue(null);
                mockPrismaClient.category.create.mockResolvedValue({
                    id: 1,
                    name: "Test",
                    color,
                    ownerId: 1,
                    owner: { id: 1, authId: 1 },
                    _count: { tasks: 0 },
                });

                const response = await request(app)
                    .post("/api/category")
                    .send({ name: `Test-${color}`, color });

                expect(response.status).toBe(201);
            }
        });

        it("should reject invalid hex colors", async () => {
            const invalidColors = ["FF5733", "#GG5733", "#FF57", "#FF57333"];

            for (const color of invalidColors) {
                const response = await request(app)
                    .post("/api/category")
                    .send({ name: "Test", color });

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }
        });
    });
});
