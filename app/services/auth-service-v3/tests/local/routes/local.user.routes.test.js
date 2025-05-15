jest.mock("@prisma/client");

const mockPrismaClient = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
  emailVerification: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrismaClient)),
};

const { PrismaClient } = require("@prisma/client");
PrismaClient.mockImplementation(() => mockPrismaClient);

jest.mock("../utils/email.util");
jest.mock("../routes/auth.ratelimit.js", () => ({
  registerLimiter: (req, res, next) => next(),
  loginLimiter: (req, res, next) => next(),
  emailLimiter: (req, res, next) => next(),
}));

const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");
const authRoutes = require("../routes/auth.routes");
const { errorHandler } = require("../middleware/error.middleware");

describe("Auth Routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/auth", authRoutes);
    app.use(errorHandler);

    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "Password123!",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 1,
        username: userData.username,
        email: userData.email,
        password: "hashedPassword",
        isVerified: false,
      });
      mockPrismaClient.emailVerification.create.mockResolvedValue({
        id: 1,
        userId: 1,
        token: "verification-token",
        expiresAt: new Date(),
      });

      const response = await request(app)
        .post("/auth/register")
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user).not.toHaveProperty("password");
    });

    it("should return 400 for invalid input", async () => {
      const invalidData = {
        username: "ab", // too short
        email: "invalid-email",
        password: "weak",
      };

      const response = await request(app)
        .post("/auth/register")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toBeDefined();
    });

    it("should return 409 for duplicate user", async () => {
      const userData = {
        username: "existinguser",
        email: "existing@example.com",
        password: "Password123!",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: userData.username,
        email: userData.email,
      });

      const response = await request(app)
        .post("/auth/register")
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Username or email already exists");
    });
  });

  describe("POST /auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const loginData = {
        username: "testuser",
        password: "Password123!",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: loginData.username,
        password: await bcrypt.hash(loginData.password, 10),
        isVerified: true,
      });

      const response = await request(app)
        .post("/auth/login")
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("should return 401 for invalid credentials", async () => {
      const loginData = {
        username: "wronguser",
        password: "wrongpass",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post("/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return 403 for unverified email", async () => {
      const loginData = {
        username: "testuser",
        password: "Password123!",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: loginData.username,
        password: await bcrypt.hash(loginData.password, 10),
        isVerified: false,
      });

      const response = await request(app)
        .post("/auth/login")
        .send(loginData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Please verify your email before logging in");
    });
  });

  describe("GET /auth/verify-email", () => {
    it("should verify email successfully", async () => {
      const token = "verification-token";

      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        token,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1 },
      });

      const response = await request(app)
        .get("/auth/verify-email")
        .query({ token });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Email verified successfully");
    });

    it("should return 400 for missing token", async () => {
      const response = await request(app)
        .get("/auth/verify-email");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /auth/change-password", () => {
    it("should change password successfully", async () => {
      const changeData = {
        token: "refresh-token",
        username: "testuser",
        oldPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: changeData.token,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: changeData.username,
        password: await bcrypt.hash(changeData.oldPassword, 10),
      });

      const response = await request(app)
        .post("/auth/change-password")
        .send(changeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Password changed successfully");
    });

    it("should return 400 for invalid input", async () => {
      const invalidData = {
        token: "",
        newPassword: "weak",
      };

      const response = await request(app)
        .post("/auth/change-password")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /auth/token", () => {
    it("should refresh token successfully", async () => {
      const refreshToken = "valid-refresh-token";

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: refreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1, isVerified: true },
      });

      const jwt = require("jsonwebtoken");
      jest.spyOn(jwt, "verify").mockImplementation((token, secret, callback) => {
        callback(null, { id: 1 });
      });

      const response = await request(app)
        .post("/auth/token")
        .send({ token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("accessToken");
    });

    it("should return 401 for invalid refresh token", async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/auth/token")
        .send({ token: "invalid-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /auth/logout", () => {
    it("should logout successfully", async () => {
      const response = await request(app)
        .delete("/auth/logout")
        .send({ token: "refresh-token" });

      expect(response.status).toBe(204);
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: "refresh-token" },
      });
    });

    it("should return 400 for missing token", async () => {
      const response = await request(app)
        .delete("/auth/logout")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /auth/remove-user", () => {
    it("should remove user successfully", async () => {
      const removeData = {
        token: "refresh-token",
        username: "testuser",
        password: "Password123!",
      };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: removeData.token,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: removeData.username,
        password: await bcrypt.hash(removeData.password, 10),
      });

      const response = await request(app)
        .delete("/auth/remove-user")
        .send(removeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("User account deleted successfully");
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .delete("/auth/remove-user")
        .send({ token: "token" }); // missing username and password

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /auth/verify", () => {
    it("should verify token successfully", async () => {
      const jwt = require("jsonwebtoken");

      jest.spyOn(jwt, "verify").mockImplementation((token, secret, callback) => {
        callback(null, { id: 1 });
      });

      const response = await request(app)
        .post("/auth/verify")
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user).toEqual({ id: 1 });
    });

    it("should return 401 for missing token", async () => {
      const response = await request(app)
        .post("/auth/verify");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authorization token required");
    });

    it("should return 403 for invalid token", async () => {
      const jwt = require("jsonwebtoken");

      jest.spyOn(jwt, "verify").mockImplementation((token, secret, callback) => {
        callback(new Error("Invalid token"), null);
      });

      const response = await request(app)
        .post("/auth/verify")
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe("Invalid or expired token");
    });
  });

  describe("POST /auth/resend-verification", () => {
    it("should resend verification email successfully", async () => {
      const email = "test@example.com";

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email,
        username: "testuser",
        isVerified: false,
        EmailVerification: null,
      });

      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Verification email sent");
    });

    it("should return 400 for invalid email", async () => {
      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: "invalid-email" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 for non-existent user", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: "nonexistent@example.com" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("User not found");
    });
  });
});
