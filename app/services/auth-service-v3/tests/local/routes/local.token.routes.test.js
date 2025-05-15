jest.mock("@prisma/client");
jest.mock("jsonwebtoken");

const mockPrismaClient = {
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(() => mockPrismaClient);

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const tokenRoutes = require("../../../local/routes/local.token.routes.js");
const { errorHandler } = require("../../../shared-middleware/error.handler.js");
const { generateAccessToken } = require("../../../utils/token.utils.js");

jest.mock("../../../utils/token.utils.js", () => ({
  generateAccessToken: jest.fn().mockReturnValue("new-access-token")
}));

describe("Token Routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));

    // Set up test environment
    process.env.ACCESS_TOKEN_SECRET = "test-access-token-secret";
    process.env.REFRESH_TOKEN_SECRET = "test-refresh-token-secret";

    // Create a mock Express app
    app = express();
    app.use(express.json());
    app.use("/", tokenRoutes);
    app.use(errorHandler);

    // Silence console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("POST /token", () => {
    it("should refresh token successfully", async () => {
      const refreshToken = "valid-refresh-token";

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: refreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1, isVerified: true },
      });

      // Mock JWT verify to call callback with decoded token
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 1 });
      });

      const response = await request(app)
        .post("/token")
        .send({ token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("accessToken", "new-access-token");
    });

    it("should return 401 for invalid refresh token", async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/token")
        .send({ token: "invalid-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid refresh token");
    });

    it("should return 400 for missing token", async () => {
      const response = await request(app)
        .post("/token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /verify", () => {
    it("should verify token successfully", async () => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 1 });
      });

      const response = await request(app)
        .post("/verify")
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user).toEqual({ id: 1 });
    });

    it("should return 401 for missing token", async () => {
      const response = await request(app)
        .post("/verify");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authorization token required");
    });

    it("should return 403 for invalid token", async () => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error("Invalid token"), null);
      });

      const response = await request(app)
        .post("/verify")
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe("Invalid or expired token");
    });
  });
});
