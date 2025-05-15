jest.mock("@prisma/client");
jest.mock("../../utils/email.utils.js");
jest.mock("bcrypt");
jest.mock("jsonwebtoken");

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
const app = require("../../server.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendVerificationEmail = require("../../utils/email.utils.js");

describe("Local Auth Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));
    sendVerificationEmail.mockResolvedValue(true);
    bcrypt.hash.mockImplementation((password) => Promise.resolve(`hashed_${password}`));
    bcrypt.compare.mockImplementation((password, hash) => Promise.resolve(hash === `hashed_${password}`));
    process.env.ACCESS_TOKEN_SECRET = "test-access-token-secret";
    process.env.REFRESH_TOKEN_SECRET = "test-refresh-token-secret";
  });

  describe("Complete Local Auth Flow", () => {
    it("should complete the full local auth flow", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "Password123!"
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 1,
        username: userData.username,
        email: userData.email,
        password: `hashed_${userData.password}`,
        isVerified: false,
      });
      mockPrismaClient.emailVerification.create.mockResolvedValue({
        id: 1,
        userId: 1,
        token: "verification-token",
        expiresAt: new Date(Date.now() + 86400000),
      });

      const registerResponse = await request(app)
        .post("/local/user/register")
        .send(userData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.username).toBe(userData.username);

      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        token: "verification-token",
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1 },
      });

      const verifyResponse = await request(app)
        .get("/local/email/verify-email")
        .query({ token: "verification-token" });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.message).toBe("Email verified successfully");

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: userData.username,
        email: userData.email,
        password: `hashed_${userData.password}`,
        isVerified: true,
      });

      jwt.sign = jest.fn()
        .mockReturnValueOnce("access-token")   // For access token
        .mockReturnValueOnce("refresh-token"); // For refresh token

      const loginResponse = await request(app)
        .post("/local/user/login")
        .send({
          username: userData.username,
          password: userData.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty("accessToken", "access-token");
      expect(loginResponse.body.data).toHaveProperty("refreshToken", "refresh-token");

      jwt.verify = jest.fn((token, secret, callback) => {
        callback(null, { id: 1 });
      });

      const verifyTokenResponse = await request(app)
        .post("/local/token/verify")
        .set("Authorization", "Bearer access-token");

      expect(verifyTokenResponse.status).toBe(200);
      expect(verifyTokenResponse.body.success).toBe(true);
      expect(verifyTokenResponse.body.data.valid).toBe(true);
      expect(verifyTokenResponse.body.data.user).toEqual({ id: 1 });

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: "refresh-token",
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1, isVerified: true },
      });

      jwt.sign.mockReturnValueOnce("new-access-token"); // For the new access token

      const refreshResponse = await request(app)
        .post("/local/token/token")
        .send({ token: "refresh-token" });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty("accessToken", "new-access-token");

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: "refresh-token",
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1 },
      });

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: userData.username,
        email: userData.email,
        password: `hashed_${userData.password}`,
        isVerified: true,
      });

      const newPassword = "NewPassword123!";
      const changePasswordResponse = await request(app)
        .post("/local/user/change-password")
        .send({
          token: "refresh-token",
          username: userData.username,
          oldPassword: userData.password,
          newPassword: newPassword,
        });

      expect(changePasswordResponse.status).toBe(200);
      expect(changePasswordResponse.body.success).toBe(true);
      expect(changePasswordResponse.body.data.message).toBe("Password changed successfully");

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: userData.username,
        email: userData.email,
        password: `hashed_${newPassword}`,
        isVerified: true,
      });

      jwt.sign = jest.fn()
        .mockReturnValueOnce("new-access-token-2")   // For access token
        .mockReturnValueOnce("new-refresh-token"); // For refresh token

      const newLoginResponse = await request(app)
        .post("/local/user/login")
        .send({
          username: userData.username,
          password: newPassword,
        });

      expect(newLoginResponse.status).toBe(200);
      expect(newLoginResponse.body.success).toBe(true);
      expect(newLoginResponse.body.data).toHaveProperty("accessToken");
      expect(newLoginResponse.body.data).toHaveProperty("refreshToken");

      const logoutResponse = await request(app)
        .delete("/local/user/logout")
        .send({ token: newLoginResponse.body.data.refreshToken });

      expect(logoutResponse.status).toBe(204);
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalled();

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: newLoginResponse.body.data.refreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1 },
      });

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: userData.username,
        email: userData.email,
        password: `hashed_${newPassword}`,
        isVerified: true,
      });

      const removeUserResponse = await request(app)
        .delete("/local/user/remove-user")
        .send({
          token: newLoginResponse.body.data.refreshToken,
          username: userData.username,
          password: newPassword,
        });

      expect(removeUserResponse.status).toBe(200);
      expect(removeUserResponse.body.success).toBe(true);
      expect(removeUserResponse.body.data.message).toBe("User account deleted successfully");
      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle registration with existing user", async () => {
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
        .post("/local/user/register")
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Username or email already exists");
    });

    it("should handle invalid login credentials", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post("/local/user/login")
        .send({
          username: "wronguser",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should handle verification of invalid token", async () => {
      mockPrismaClient.emailVerification.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get("/local/email/verify-email")
        .query({ token: "invalid-token" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid verification token");
    });

    it("should handle expired token during refresh", async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: "expired-token",
        userId: 1,
        expiresAt: new Date(Date.now() - 1000), // Expired token
        user: { id: 1, isVerified: true },
      });

      const response = await request(app)
        .post("/local/token/token")
        .send({ token: "expired-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Refresh token expired");
    });
  });
});
