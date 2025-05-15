jest.mock("@prisma/client");
jest.mock("../../../utils/email.utils.js");

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

const emailController = require("../../../local/controllers/local.email.controller.js");
const sendVerificationEmail = require("../../../utils/email.utils.js");
const { ValidationError, NotFoundError } = require("../../../shared-middleware/error.custom.js");

describe("Email Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));
  });

  describe("verifyEmail", () => {
    it("should successfully verify email", async () => {
      const token = "verification-token";
      const userId = 1;

      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        userId,
        token,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: userId }
      });

      const result = await emailController.verifyEmail(token);

      expect(mockPrismaClient.emailVerification.findUnique).toHaveBeenCalledWith({
        where: { token },
        include: { user: true }
      });
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isVerified: true }
      });
      expect(mockPrismaClient.emailVerification.delete).toHaveBeenCalled();
      expect(result.message).toBe("Email verified successfully");
    });

    it("should throw ValidationError for invalid token", async () => {
      mockPrismaClient.emailVerification.findUnique.mockResolvedValue(null);

      await expect(emailController.verifyEmail("invalid-token")).rejects.toThrow(
        ValidationError
      );
      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for expired token", async () => {
      const expiredToken = "expired-token";

      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        token: expiredToken,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      await expect(emailController.verifyEmail(expiredToken)).rejects.toThrow(
        ValidationError
      );
      expect(mockPrismaClient.emailVerification.delete).toHaveBeenCalled();
      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });
  });

  describe("resendVerificationEmail", () => {
    it("should successfully resend verification email", async () => {
      const email = "test@example.com";
      const userId = 1;
      const username = "testuser";

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        username,
        isVerified: false,
        EmailVerification: {
          id: 1
        }
      });

      sendVerificationEmail.mockResolvedValue(true);

      const result = await emailController.resendVerificationEmail(email);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { EmailVerification: true }
      });
      expect(mockPrismaClient.emailVerification.delete).toHaveBeenCalled();
      expect(mockPrismaClient.emailVerification.create).toHaveBeenCalled();
      expect(result.message).toBe("Verification email sent");
    });

    it("should throw NotFoundError for non-existent user", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(emailController.resendVerificationEmail("nonexistent@example.com")).rejects.toThrow(
        NotFoundError
      );
      expect(mockPrismaClient.emailVerification.create).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for already verified email", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: "verified@example.com",
        isVerified: true
      });

      await expect(emailController.resendVerificationEmail("verified@example.com")).rejects.toThrow(
        ValidationError
      );
      expect(mockPrismaClient.emailVerification.create).not.toHaveBeenCalled();
    });

    it("should create verification if none exists", async () => {
      const email = "test@example.com";
      const userId = 1;
      const username = "testuser";

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        username,
        isVerified: false,
        EmailVerification: null
      });

      sendVerificationEmail.mockResolvedValue(true);

      await emailController.resendVerificationEmail(email);

      expect(mockPrismaClient.emailVerification.delete).not.toHaveBeenCalled();
      expect(mockPrismaClient.emailVerification.create).toHaveBeenCalled();
    });
  });
});
