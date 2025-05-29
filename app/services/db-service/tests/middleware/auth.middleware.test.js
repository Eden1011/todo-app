jest.mock("axios");

const axios = require("axios");
const { authenticateToken } = require("../../middleware/db.auth-token");

describe("Authentication Middleware", () => {
    let req, res, next;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();

        process.env.AUTH_SERVICE_URL = "http://localhost:3000";
    });

    it("should return 401 if no authorization header", async () => {
        await authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Authorization token required",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if no token in authorization header", async () => {
        req.headers["authorization"] = "Bearer ";

        await authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Authorization token required",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next and set req.user if token is valid", async () => {
        req.headers["authorization"] = "Bearer valid-token";

        axios.post.mockResolvedValue({
            data: {
                success: true,
                data: {
                    valid: true,
                    user: { id: 1, username: "testuser" },
                },
            },
        });

        await authenticateToken(req, res, next);

        expect(axios.post).toHaveBeenCalledWith(
            "http://localhost:3000/local/token/verify",
            {},
            {
                headers: {
                    Authorization: "Bearer valid-token",
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            },
        );

        expect(req.user).toEqual({ id: 1, username: "testuser" });
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it("should return 403 if token is invalid", async () => {
        req.headers["authorization"] = "Bearer invalid-token";

        axios.post.mockResolvedValue({
            data: {
                success: false,
                data: {
                    valid: false,
                },
            },
        });

        await authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Invalid or expired token",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should handle auth service error response", async () => {
        req.headers["authorization"] = "Bearer test-token";

        axios.post.mockResolvedValue({
            status: 401,
            data: {
                error: "Token expired",
            },
        });

        await authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Invalid or expired token",
        });
    });

    it("should return 503 if auth service is unavailable", async () => {
        req.headers["authorization"] = "Bearer test-token";

        const connectionError = new Error("Connection refused");
        connectionError.code = "ECONNREFUSED";
        axios.post.mockRejectedValue(connectionError);

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        await authenticateToken(req, res, next);

        expect(consoleSpy).toHaveBeenCalledWith(
            "Auth service is not available:",
            "Connection refused",
        );
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Authentication service unavailable",
        });

        consoleSpy.mockRestore();
    });

    it("should return 504 if auth service times out", async () => {
        req.headers["authorization"] = "Bearer test-token";

        const timeoutError = new Error("Timeout");
        timeoutError.code = "ECONNABORTED";
        axios.post.mockRejectedValue(timeoutError);

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        await authenticateToken(req, res, next);

        expect(consoleSpy).toHaveBeenCalledWith(
            "Auth service timeout:",
            "Timeout",
        );
        expect(res.status).toHaveBeenCalledWith(504);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Authentication service timeout",
        });

        consoleSpy.mockRestore();
    });

    it("should return 500 for other errors", async () => {
        req.headers["authorization"] = "Bearer test-token";

        axios.post.mockRejectedValue(new Error("Unknown error"));

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        await authenticateToken(req, res, next);

        expect(consoleSpy).toHaveBeenCalledWith(
            "Auth service error:",
            "Unknown error",
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Internal authentication error",
        });

        consoleSpy.mockRestore();
    });

    it("should handle auth service HTTP error response", async () => {
        req.headers["authorization"] = "Bearer expired-token";

        const errorResponse = {
            response: {
                status: 401,
                data: {
                    error: "Token has expired",
                },
            },
        };
        axios.post.mockRejectedValue(errorResponse);

        await authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Token has expired",
        });
    });
});
