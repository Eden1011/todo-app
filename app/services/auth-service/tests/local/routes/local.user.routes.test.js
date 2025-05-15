jest.mock("@prisma/client");
jest.mock("bcrypt");
jest.mock("../../../utils/email.utils.js");
jest.mock("../../../utils/token.utils.js");
jest.mock("../../../local/middleware/local.rate-limit.js", () => ({
  registerLimiter: (req, res, next) => next(),
  loginLimiter: (req, res, next) => next(),
}));

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

require("@prisma/client").PrismaClient.mockImplementation(() => mockPrismaClient);

const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");
const userRoutes = require("../../../local/routes/local.user.routes.js");
const { errorHandler } = require("../../../shared-middleware/error.handler.js");
const { generateAccessToken, generateRefreshToken } = require("../../../utils/token.utils.js");

describe("User Routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));

    app = express();
    app.use(express.json());
    app.use("/", userRoutes);
    app.use(errorHandler);
  });

  describe("POST /register", () => {
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

      process.env.AUTO_LOGIN_AFTER_REGISTER = "true";
      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");

      const response = await request(app)
        .post("/register")
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user).not.toHaveProperty("password");
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("should return 400 for invalid input", async () => {
      const invalidData = {
        username: "ab", // too short
        email: "invalid-email",
        password: "weak",
      };

      const response = await request(app)
        .post("/register")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
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
        .post("/register")
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Username or email already exists");
    });
  });

  describe("POST /login", () => {
    it("should login successfully with valid credentials", async () => {
      const loginData = {
        username: "testuser",
        password: "Password123!",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: loginData.username,
        password: "hashedPassword",
        isVerified: true,
      });
      bcrypt.compare.mockResolvedValue(true);
      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");

      const response = await request(app)
        .post("/login")
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
        .post("/login")
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
        password: "hashedPassword",
        isVerified: false,
      });
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post("/login")
        .send(loginData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Please verify your email before logging in");
    });
  });

  describe("POST /change-password", () => {
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
        user: { id: 1 },
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: changeData.username,
        password: "hashedPassword",
      });
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post("/change-password")
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
        .post("/change-password")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /logout", () => {
    it("should logout successfully", async () => {
      const response = await request(app)
        .delete("/logout")
        .send({ token: "refresh-token" });

      expect(response.status).toBe(204);
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: "refresh-token" },
      });
    });

    it("should return 400 for missing token", async () => {
      const response = await request(app)
        .delete("/logout")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /remove-user", () => {
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
        user: { id: 1 },
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: removeData.username,
        password: "hashedPassword",
      });
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .delete("/remove-user")
        .send(removeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("User account deleted successfully");
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .delete("/remove-user")
        .send({ token: "token" }); // missing username and password

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
