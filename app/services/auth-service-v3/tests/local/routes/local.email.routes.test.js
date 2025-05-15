jest.mock("@prisma/client");
jest.mock("../../../utils/email.utils.js");
jest.mock("../../../local/middleware/local.rate-limit.js", () => ({
  emailLimiter: (req, res, next) => next(),
}));

const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
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
const emailRoutes = require("../../../local/routes/local.email.routes.js");
const { errorHandler } = require("../../../shared-middleware/error.handler.js");
const sendVerificationEmail = require("../../../utils/email.utils.js");

describe("Email Routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));

    app = express();
    app.use(express.json());
    app.use("/", emailRoutes);
    app.use(errorHandler);

    sendVerificationEmail.mockResolvedValue(true);
  });

  describe("GET /verify-email", () => {
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
        .get("/verify-email")
        .query({ token });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Email verified successfully");
    });

    it("should return 400 for missing token", async () => {
      const response = await request(app)
        .get("/verify-email");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for invalid token", async () => {
      mockPrismaClient.emailVerification.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get("/verify-email")
        .query({ token: "invalid-token" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid verification token");
    });

    it("should return 400 for expired token", async () => {
      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        token: "expired-token",
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      const response = await request(app)
        .get("/verify-email")
        .query({ token: "expired-token" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Verification token has expired");
    });
  });

  describe("POST /resend-verification", () => {
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
        .post("/resend-verification")
        .send({ email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Verification email sent");
    });

    it("should return 400 for invalid email", async () => {
      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "invalid-email" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 for non-existent user", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "nonexistent@example.com" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("User not found");
    });

    it("should return 400 for already verified email", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: "verified@example.com",
        isVerified: true,
      });

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: "verified@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Email is already verified");
    });
  });
});
