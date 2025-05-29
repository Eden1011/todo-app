const {
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
} = require("@prisma/client");

const {
    errorHandler,
    notFound,
    AppError,
    asyncHandler,
} = require("../../middleware/error.handler");

describe("Error Handler Middleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            path: "/api/test",
            method: "GET",
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();

        // Mock console to avoid cluttering test output
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe("errorHandler", () => {
        it("should handle generic errors", () => {
            const error = new Error("Test error");
            process.env.NODE_ENV = "development";

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Test error",
                stack: expect.any(String),
                details: undefined,
            });
        });

        it("should handle AppError with custom status code", () => {
            const error = new AppError("Custom error", 400);

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Custom error",
            });
        });

        it("should handle Prisma unique constraint error (P2002)", () => {
            const error = new PrismaClientKnownRequestError(
                "Unique constraint failed",
                {
                    code: "P2002",
                    clientVersion: "4.0.0",
                    meta: {
                        target: ["name"],
                    },
                },
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Name already exists",
            });
        });

        it("should handle Prisma record not found error (P2025)", () => {
            const error = new PrismaClientKnownRequestError(
                "Record not found",
                {
                    code: "P2025",
                    clientVersion: "4.0.0",
                },
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Resource not found",
            });
        });

        it("should handle Prisma invalid reference error (P2014)", () => {
            const error = new PrismaClientKnownRequestError(
                "Invalid reference",
                {
                    code: "P2014",
                    clientVersion: "4.0.0",
                },
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Invalid reference to another record",
            });
        });

        it("should handle unknown Prisma known request error", () => {
            const error = new PrismaClientKnownRequestError("Unknown error", {
                code: "P9999",
                clientVersion: "4.0.0",
            });

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Database error occurred",
            });
        });

        it("should handle Prisma validation error", () => {
            const error = new PrismaClientValidationError(
                "Validation failed",
                "4.0.0",
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Invalid data provided",
            });
        });

        it("should handle validation errors with details", () => {
            const error = {
                errors: [
                    {
                        msg: "Title is required",
                        param: "title",
                        location: "body",
                    },
                    {
                        msg: "Invalid email format",
                        param: "email",
                        location: "body",
                    },
                ],
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Validation failed",
                details: error.errors,
            });
        });

        it("should handle rate limit errors", () => {
            const error = new Error("Too many requests from this IP");

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(429);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Too many requests from this IP",
            });
        });

        it("should not include stack trace in production", () => {
            const error = new Error("Test error");
            process.env.NODE_ENV = "production";

            errorHandler(error, req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Test error",
            });
        });

        it("should not log errors in test environment", () => {
            const error = new Error("Test error");
            process.env.NODE_ENV = "test";

            errorHandler(error, req, res, next);

            expect(console.error).not.toHaveBeenCalled();
        });

        it("should log errors in development environment", () => {
            const error = new Error("Test error");
            process.env.NODE_ENV = "development";

            errorHandler(error, req, res, next);

            expect(console.error).toHaveBeenCalledWith("Error occurred:", {
                message: "Test error",
                stack: expect.any(String),
                path: "/api/test",
                method: "GET",
                timestamp: expect.any(String),
            });
        });

        it("should handle unique constraint with authId field", () => {
            const error = new PrismaClientKnownRequestError(
                "Unique constraint failed",
                {
                    code: "P2002",
                    clientVersion: "4.0.0",
                    meta: {
                        target: ["authId"],
                    },
                },
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "User ID already exists",
            });
        });

        it("should handle unique constraint with unknown field", () => {
            const error = new PrismaClientKnownRequestError(
                "Unique constraint failed",
                {
                    code: "P2002",
                    clientVersion: "4.0.0",
                    meta: {
                        target: ["unknownField"],
                    },
                },
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "unknownField already exists",
            });
        });

        it("should handle unique constraint with array target", () => {
            const error = new PrismaClientKnownRequestError(
                "Unique constraint failed",
                {
                    code: "P2002",
                    clientVersion: "4.0.0",
                    meta: {
                        target: ["email", "username"],
                    },
                },
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "email already exists",
            });
        });

        it("should handle unique constraint with no meta", () => {
            const error = new PrismaClientKnownRequestError(
                "Unique constraint failed",
                {
                    code: "P2002",
                    clientVersion: "4.0.0",
                },
            );

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Duplicate value not allowed",
            });
        });
    });

    describe("notFound", () => {
        it("should create 404 error for unknown routes", () => {
            req.path = "/api/unknown";

            notFound(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Route /api/unknown not found",
                    statusCode: 404,
                }),
            );
        });
    });

    describe("AppError", () => {
        it("should create custom error with status code", () => {
            const error = new AppError("Custom error", 400);

            expect(error.message).toBe("Custom error");
            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
        });

        it("should create custom error with default operational flag", () => {
            const error = new AppError("Custom error", 400, false);

            expect(error.isOperational).toBe(false);
        });

        it("should capture stack trace", () => {
            const error = new AppError("Custom error", 400);

            expect(error.stack).toBeDefined();
        });
    });

    describe("asyncHandler", () => {
        it("should handle successful async function", async () => {
            const asyncFn = jest.fn().mockResolvedValue("success");
            const wrappedFn = asyncHandler(asyncFn);

            await wrappedFn(req, res, next);

            expect(asyncFn).toHaveBeenCalledWith(req, res, next);
            expect(next).not.toHaveBeenCalled();
        });

        it("should catch and forward async errors", async () => {
            const error = new Error("Async error");
            const asyncFn = jest.fn().mockRejectedValue(error);
            const wrappedFn = asyncHandler(asyncFn);

            await wrappedFn(req, res, next);

            expect(asyncFn).toHaveBeenCalledWith(req, res, next);
            expect(next).toHaveBeenCalledWith(error);
        });

        it("should handle sync function that returns promise", async () => {
            const asyncFn = jest.fn(() => Promise.resolve("success"));
            const wrappedFn = asyncHandler(asyncFn);

            await wrappedFn(req, res, next);

            expect(asyncFn).toHaveBeenCalledWith(req, res, next);
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle sync function that throws", async () => {
            const error = new Error("Sync error");
            const asyncFn = jest.fn(() => {
                throw error;
            });
            const wrappedFn = asyncHandler(asyncFn);

            await wrappedFn(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
