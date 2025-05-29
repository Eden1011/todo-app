jest.mock("axios");

const axios = require("axios");
const {
    verifyToken,
    getUserInfo,
    isAuthServiceAvailable,
    getAuthServiceHealth,
    AUTH_SERVICE_URL,
} = require("../../utils/auth-service.connection");

describe("Auth Service Connection", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AUTH_SERVICE_URL = "http://localhost:3000";
    });

    describe("verifyToken", () => {
        it("should verify token successfully", async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        valid: true,
                        user: { id: 1, username: "testuser" },
                    },
                },
            };

            axios.post.mockResolvedValue(mockResponse);

            const result = await verifyToken("valid-token");

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

            expect(result).toEqual({ id: 1, username: "testuser" });
        });

        it("should throw error for invalid token", async () => {
            const mockResponse = {
                data: {
                    success: false,
                    data: {
                        valid: false,
                    },
                },
            };

            axios.post.mockResolvedValue(mockResponse);

            await expect(verifyToken("invalid-token")).rejects.toThrow(
                "Invalid token",
            );
        });

        it("should throw error when auth service request fails", async () => {
            axios.post.mockRejectedValue(new Error("Network error"));

            await expect(verifyToken("test-token")).rejects.toThrow(
                "Token verification failed: Network error",
            );
        });

        it("should throw error when auth service returns unsuccessful response", async () => {
            const mockResponse = {
                data: {
                    success: false,
                    error: "Token expired",
                },
            };

            axios.post.mockResolvedValue(mockResponse);

            await expect(verifyToken("expired-token")).rejects.toThrow(
                "Invalid token",
            );
        });
    });

    describe("getUserInfo", () => {
        it("should get user info successfully", async () => {
            const mockUser = { id: 1, username: "testuser" };
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        valid: true,
                        user: mockUser,
                    },
                },
            };

            axios.post.mockResolvedValue(mockResponse);

            const result = await getUserInfo("valid-token");

            expect(result).toEqual(mockUser);
        });

        it("should throw error for invalid token", async () => {
            axios.post.mockRejectedValue(new Error("Invalid token"));

            await expect(getUserInfo("invalid-token")).rejects.toThrow(
                "Invalid token",
            );
        });
    });

    describe("isAuthServiceAvailable", () => {
        it("should return true when auth service is available", async () => {
            axios.get.mockResolvedValue({ status: 200 });

            const result = await isAuthServiceAvailable();

            expect(axios.get).toHaveBeenCalledWith(
                "http://localhost:3000/health",
                {
                    timeout: 3000,
                },
            );
            expect(result).toBe(true);
        });

        it("should return false when auth service is unavailable", async () => {
            axios.get.mockRejectedValue(new Error("Service unavailable"));

            const result = await isAuthServiceAvailable();

            expect(result).toBe(false);
        });

        it("should return false when auth service returns non-200 status", async () => {
            axios.get.mockResolvedValue({ status: 500 });

            const result = await isAuthServiceAvailable();

            expect(result).toBe(false);
        });
    });

    describe("getAuthServiceHealth", () => {
        it("should return health status when service is available", async () => {
            const mockHealthData = {
                status: "ok",
                timestamp: "2025-05-28T10:00:00.000Z",
                service: "auth-service",
            };

            axios.get.mockResolvedValue({
                data: mockHealthData,
            });

            const result = await getAuthServiceHealth();

            expect(result).toEqual({
                available: true,
                status: mockHealthData,
                url: "http://localhost:3000",
            });
        });

        it("should return error status when service is unavailable", async () => {
            const error = new Error("Connection refused");
            axios.get.mockRejectedValue(error);

            const result = await getAuthServiceHealth();

            expect(result).toEqual({
                available: false,
                error: "Connection refused",
                url: "http://localhost:3000",
            });
        });

        it("should use default URL when AUTH_SERVICE_URL is not set", async () => {
            delete process.env.AUTH_SERVICE_URL;

            axios.get.mockResolvedValue({
                data: { status: "ok" },
            });

            const result = await getAuthServiceHealth();

            expect(axios.get).toHaveBeenCalledWith(
                "http://localhost:3000/health",
                {
                    timeout: 3000,
                },
            );
            expect(result.url).toBe("http://localhost:3000");
        });
    });

    describe("AUTH_SERVICE_URL", () => {
        it("should use environment variable when set", () => {
            process.env.AUTH_SERVICE_URL = "http://custom-auth:3000";

            // Re-require the module to pick up the new environment variable
            jest.resetModules();
            const authConnection = require("../../utils/auth-service.connection");

            expect(authConnection.AUTH_SERVICE_URL).toBe(
                "http://custom-auth:3000",
            );
        });

        it("should use default URL when environment variable is not set", () => {
            delete process.env.AUTH_SERVICE_URL;

            // Re-require the module to pick up the change
            jest.resetModules();
            const authConnection = require("../../utils/auth-service.connection");

            expect(authConnection.AUTH_SERVICE_URL).toBe(
                "http://localhost:3000",
            );
        });
    });

    describe("Error handling", () => {
        it("should handle timeout errors properly", async () => {
            const timeoutError = new Error("Timeout");
            timeoutError.code = "ECONNABORTED";
            axios.post.mockRejectedValue(timeoutError);

            await expect(verifyToken("test-token")).rejects.toThrow(
                "Token verification failed: Timeout",
            );
        });

        it("should handle network errors properly", async () => {
            const networkError = new Error("Network Error");
            networkError.code = "ENOTFOUND";
            axios.post.mockRejectedValue(networkError);

            await expect(verifyToken("test-token")).rejects.toThrow(
                "Token verification failed: Network Error",
            );
        });

        it("should handle auth service error responses", async () => {
            const errorResponse = {
                response: {
                    status: 401,
                    data: {
                        error: "Unauthorized",
                    },
                },
            };
            axios.post.mockRejectedValue(errorResponse);

            await expect(verifyToken("test-token")).rejects.toThrow(
                "Token verification failed: Unauthorized",
            );
        });
    });
});
