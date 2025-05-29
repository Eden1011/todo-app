const express = require("express");
const request = require("supertest");
const {
    createTaskValidation,
    updateTaskValidation,
    getTasksValidation,
    createCategoryValidation,
    createTagValidation,
    createProjectValidation,
    handleValidationErrors,
} = require("../../middleware/validation");

const createTestApp = (validationMiddleware) => {
    const app = express();
    app.use(express.json());

    app.post(
        "/test",
        validationMiddleware,
        handleValidationErrors,
        (req, res) => {
            res.json({ success: true, data: req.body });
        },
    );

    app.get(
        "/test",
        validationMiddleware,
        handleValidationErrors,
        (req, res) => {
            res.json({ success: true, data: req.query });
        },
    );

    app.put(
        "/test/:id",
        validationMiddleware,
        handleValidationErrors,
        (req, res) => {
            res.json({
                success: true,
                data: { ...req.body, id: req.params.id },
            });
        },
    );

    return app;
};

describe("Validation Middleware", () => {
    describe("createTaskValidation", () => {
        let app;

        beforeEach(() => {
            app = createTestApp(createTaskValidation);
        });

        it("should accept valid task data", async () => {
            const validData = {
                title: "Test Task",
                description: "Test description",
                priority: "HIGH",
                status: "TODO",
                dueDate: "2025-06-01T10:00:00.000Z",
                assigneeAuthId: 1,
                projectId: 1,
                categoryIds: [1, 2],
                tagIds: [1, 2],
            };

            const response = await request(app).post("/test").send(validData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should reject empty title", async () => {
            const invalidData = {
                title: "",
                description: "Test description",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Title must be between 1 and 200 characters",
                    path: "title",
                }),
            );
        });

        it("should reject title that's too long", async () => {
            const invalidData = {
                title: "a".repeat(201),
                description: "Test description",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Title must be between 1 and 200 characters",
                    path: "title",
                }),
            );
        });

        it("should reject invalid priority", async () => {
            const invalidData = {
                title: "Test Task",
                priority: "INVALID",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Priority must be LOW, MEDIUM, HIGH, or URGENT",
                    path: "priority",
                }),
            );
        });

        it("should reject invalid status", async () => {
            const invalidData = {
                title: "Test Task",
                status: "INVALID",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Status must be TODO, IN_PROGRESS, REVIEW, DONE, or CANCELED",
                    path: "status",
                }),
            );
        });

        it("should reject invalid due date", async () => {
            const invalidData = {
                title: "Test Task",
                dueDate: "invalid-date",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Due date must be a valid ISO8601 date",
                    path: "dueDate",
                }),
            );
        });

        it("should reject invalid assigneeAuthId", async () => {
            const invalidData = {
                title: "Test Task",
                assigneeAuthId: -1,
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Assignee auth ID must be a positive integer",
                    path: "assigneeAuthId",
                }),
            );
        });

        it("should reject non-array categoryIds", async () => {
            const invalidData = {
                title: "Test Task",
                categoryIds: "not-an-array",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Category IDs must be an array",
                    path: "categoryIds",
                }),
            );
        });
    });

    describe("getTasksValidation", () => {
        let app;

        beforeEach(() => {
            app = createTestApp(getTasksValidation);
        });

        it("should accept valid query parameters", async () => {
            const response = await request(app).get(
                "/test?page=1&limit=20&status=TODO&priority=HIGH&search=test&sortBy=title&sortOrder=asc",
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should reject invalid page", async () => {
            const response = await request(app).get("/test?page=0");

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Page must be a positive integer",
                    path: "page",
                }),
            );
        });

        it("should reject invalid limit", async () => {
            const response = await request(app).get("/test?limit=101");

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Limit must be between 1 and 100",
                    path: "limit",
                }),
            );
        });

        it("should reject search that's too short", async () => {
            const response = await request(app).get("/test?search=a");

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Search must be between 2 and 100 characters",
                    path: "search",
                }),
            );
        });

        it("should reject invalid sortBy", async () => {
            const response = await request(app).get("/test?sortBy=invalid");

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "SortBy must be title, status, priority, dueDate, createdAt, or updatedAt",
                    path: "sortBy",
                }),
            );
        });

        it("should reject invalid sortOrder", async () => {
            const response = await request(app).get("/test?sortOrder=invalid");

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "SortOrder must be asc or desc",
                    path: "sortOrder",
                }),
            );
        });
    });

    describe("createCategoryValidation", () => {
        let app;

        beforeEach(() => {
            app = createTestApp(createCategoryValidation);
        });

        it("should accept valid category data", async () => {
            const validData = {
                name: "Work",
                color: "#FF5733",
            };

            const response = await request(app).post("/test").send(validData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should reject empty name", async () => {
            const invalidData = {
                name: "",
                color: "#FF5733",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Name must be between 1 and 100 characters",
                    path: "name",
                }),
            );
        });

        it("should reject invalid hex color", async () => {
            const invalidData = {
                name: "Work",
                color: "invalid-color",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Color must be a valid hex color code",
                    path: "color",
                }),
            );
        });

        it("should accept category without color", async () => {
            const validData = {
                name: "Work",
            };

            const response = await request(app).post("/test").send(validData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe("createTagValidation", () => {
        let app;

        beforeEach(() => {
            app = createTestApp(createTagValidation);
        });

        it("should accept valid tag data", async () => {
            const validData = {
                name: "urgent",
                color: "#FF0000",
            };

            const response = await request(app).post("/test").send(validData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should reject name that's too long", async () => {
            const invalidData = {
                name: "a".repeat(51),
                color: "#FF0000",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Name must be between 1 and 50 characters",
                    path: "name",
                }),
            );
        });
    });

    describe("createProjectValidation", () => {
        let app;

        beforeEach(() => {
            app = createTestApp(createProjectValidation);
        });

        it("should accept valid project data", async () => {
            const validData = {
                name: "Test Project",
                description: "A test project for validation",
            };

            const response = await request(app).post("/test").send(validData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should reject name that's too long", async () => {
            const invalidData = {
                name: "a".repeat(201),
                description: "Test description",
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Name must be between 1 and 200 characters",
                    path: "name",
                }),
            );
        });

        it("should reject description that's too long", async () => {
            const invalidData = {
                name: "Test Project",
                description: "a".repeat(1001),
            };

            const response = await request(app).post("/test").send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Description must be less than 1000 characters",
                    path: "description",
                }),
            );
        });
    });

    describe("updateTaskValidation", () => {
        let app;

        beforeEach(() => {
            app = createTestApp(updateTaskValidation);
        });

        it("should accept valid update data", async () => {
            const validData = {
                title: "Updated Task",
                description: "Updated description",
                priority: "HIGH",
            };

            const response = await request(app).put("/test/1").send(validData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should reject invalid id parameter", async () => {
            const response = await request(app)
                .put("/test/invalid")
                .send({ title: "Updated Task" });

            expect(response.status).toBe(400);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    msg: "Task ID must be a positive integer",
                    path: "id",
                }),
            );
        });
    });
});
