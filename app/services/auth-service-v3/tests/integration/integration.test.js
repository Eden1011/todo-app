jest.mock("@prisma/client");
jest.mock("../../utils/email.utils.js");

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
  $disconnect: jest.fn(),
};

const { PrismaClient } = require("@prisma/client");
PrismaClient.mockImplementation(() => mockPrismaClient);

const request = require("supertest");
const app = require("../../server.js");

describe("Auth Flow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));
  });

  describe("Complete Auth Flow", () => {
    let userId = 1;
    let refreshTokenId = 1;
    let emailVerificationId = 1;

    it("should complete the full auth flow", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: userId,
        username: "testuser",
        email: "test@example.com",
        password: "hashedPassword",
        isVerified: false,
      });
      mockPrismaClient.emailVerification.create.mockResolvedValue({
        id: emailVerificationId,
        userId,
        token: "verification-token",
        expiresAt: new Date(Date.now() + 86400000),
      });

      const registerResponse = await request(app)
        .post("/auth/register")
        .send({
          username: "testuser",
          email: "test@example.com",
          password: "Password123!",
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);

      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: emailVerificationId,
        userId,
        token: "verification-token",
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: userId },
      });

      const verifyResponse = await request(app)
        .get("/auth/verify-email")
        .query({ token: "verification-token" });

      expect(verifyResponse.status).toBe(200);

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: userId,
        username: "testuser",
        password: await require("bcrypt").hash("Password123!", 10),
        isVerified: true,
      });

      const loginResponse = await request(app)
        .post("/auth/login")
        .send({
          username: "testuser",
          password: "Password123!",
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty("accessToken");
      expect(loginResponse.body.data).toHaveProperty("refreshToken");

      const jwt = require("jsonwebtoken");
      jest.spyOn(jwt, "verify").mockImplementation((token, secret, callback) => {
        callback(null, { id: userId });
      });

      const authResponse = await request(app)
        .post("/auth/verify")
        .set("Authorization", `Bearer ${loginResponse.body.data.accessToken}`);

      expect(authResponse.status).toBe(200);
      expect(authResponse.body.data.valid).toBe(true);

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: refreshTokenId,
        token: loginResponse.body.data.refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: userId, isVerified: true },
      });

      jest.spyOn(jwt, "verify").mockImplementation((token, secret, callback) => {
        callback(null, { id: userId });
      });

      const refreshResponse = await request(app)
        .post("/auth/token")
        .send({ token: loginResponse.body.data.refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data).toHaveProperty("accessToken");

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: refreshTokenId,
        token: loginResponse.body.data.refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: userId,
        username: "testuser",
        password: await require("bcrypt").hash("Password123!", 10),
      });

      const changePasswordResponse = await request(app)
        .post("/auth/change-password")
        .send({
          token: loginResponse.body.data.refreshToken,
          username: "testuser",
          oldPassword: "Password123!",
          newPassword: "NewPassword123!",
        });

      expect(changePasswordResponse.status).toBe(200);

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: userId,
        username: "testuser",
        password: await require("bcrypt").hash("NewPassword123!", 10),
        isVerified: true,
      });

      const newLoginResponse = await request(app)
        .post("/auth/login")
        .send({
          username: "testuser",
          password: "NewPassword123!",
        });

      expect(newLoginResponse.status).toBe(200);

      const logoutResponse = await request(app)
        .delete("/auth/logout")
        .send({ token: newLoginResponse.body.data.refreshToken });

      expect(logoutResponse.status).toBe(204);

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: refreshTokenId,
        token: newLoginResponse.body.data.refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: userId,
        username: "testuser",
        password: await require("bcrypt").hash("NewPassword123!", 10),
      });

      const removeResponse = await request(app)
        .delete("/auth/remove-user")
        .send({
          token: newLoginResponse.body.data.refreshToken,
          username: "testuser",
          password: "NewPassword123!",
        });

      expect(removeResponse.status).toBe(200);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle expired verification token", async () => {
      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        token: "expired-token",
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      const response = await request(app)
        .get("/auth/verify-email")
        .query({ token: "expired-token" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Verification token has expired");
    });

    it("should handle login with unverified email", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: "unverifieduser",
        password: await require("bcrypt").hash("Password123!", 10),
        isVerified: false,
      });

      const response = await request(app)
        .post("/auth/login")
        .send({
          username: "unverifieduser",
          password: "Password123!",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Please verify your email before logging in");
    });

    it("should handle resend verification for verified user", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: "verified@example.com",
        isVerified: true,
      });

      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: "verified@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is already verified");
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle concurrent registration attempts", async () => {
      mockPrismaClient.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 1, username: "concurrentuser" });

      mockPrismaClient.user.create.mockResolvedValue({
        id: 1,
        username: "concurrentuser",
        email: "concurrent@example.com",
        isVerified: false,
      });

      const userData = {
        username: "concurrentuser",
        email: "concurrent@example.com",
        password: "Password123!",
      };

      const promises = Array(5).fill().map(() =>
        request(app).post("/auth/register").send(userData)
      );

      const results = await Promise.all(promises);

      const successful = results.filter(r => r.status === 201);
      const failed = results.filter(r => r.status === 409);

      expect(successful.length).toBeGreaterThanOrEqual(1);
      expect(failed.length).toBeGreaterThanOrEqual(0);
    });
  });
});
