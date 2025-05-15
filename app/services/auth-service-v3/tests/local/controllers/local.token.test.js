jest.mock("@prisma/client");
jest.mock("bcrypt");
jest.mock("../utils/email.util");
jest.mock("../utils/token.util");

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

const authService = require("../services/auth.service");
const bcrypt = require("bcrypt");
const { sendVerificationEmail } = require("../utils/email.util");
const { generateAccessToken, generateRefreshToken } = require("../utils/token.util");

describe("Auth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "Password123!",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashedPassword");
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

      const result = await authService.register(
        userData.username,
        userData.email,
        userData.password
      );

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: userData.username },
            { email: userData.email },
          ],
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty("user");
      expect(result.user).not.toHaveProperty("password");
      expect(result.message).toBe("Registration successful. Please check your email for verification instructions.");
    });

    it("should throw ConflictError if user already exists", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: "testuser",
        email: "test@example.com",
      });

      await expect(
        authService.register("testuser", "test@example.com", "Password123!")
      ).rejects.toThrow("Username or email already exists");
    });
  });

  describe("verifyEmail", () => {
    it("should successfully verify email", async () => {
      const token = "verification-token";

      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        token,
        expiresAt: new Date(Date.now() + 86400000), // 1 day in future
        user: { id: 1 },
      });

      const result = await authService.verifyEmail(token);

      expect(mockPrismaClient.emailVerification.findUnique).toHaveBeenCalledWith({
        where: { token },
        include: { user: true },
      });
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isVerified: true },
      });
      expect(mockPrismaClient.emailVerification.delete).toHaveBeenCalled();
      expect(result.message).toBe("Email verified successfully");
    });

    it("should throw ValidationError for invalid token", async () => {
      mockPrismaClient.emailVerification.findUnique.mockResolvedValue(null);

      await expect(authService.verifyEmail("invalid-token")).rejects.toThrow(
        "Invalid verification token"
      );
    });

    it("should throw ValidationError for expired token", async () => {
      mockPrismaClient.emailVerification.findUnique.mockResolvedValue({
        id: 1,
        token: "token",
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      await expect(authService.verifyEmail("token")).rejects.toThrow(
        "Verification token has expired"
      );
    });
  });

  describe("login", () => {
    it("should successfully login with valid credentials", async () => {
      const credentials = {
        username: "testuser",
        password: "Password123!",
      };

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: credentials.username,
        password: "hashedPassword",
        isVerified: true,
      });
      bcrypt.compare.mockResolvedValue(true);
      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");

      const result = await authService.login(credentials.username, null, credentials.password);

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, "hashedPassword");
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrismaClient.refreshToken.create).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should throw AuthenticationError for invalid credentials", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.login("wronguser", null, "wrongpass")
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw AuthorizationError for unverified email", async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: "testuser",
        password: "hashedPassword",
        isVerified: false,
      });
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        authService.login("testuser", null, "Password123!")
      ).rejects.toThrow("Please verify your email before logging in");
    });
  });

  describe("refreshToken", () => {
    it("should successfully refresh token", async () => {
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

      generateAccessToken.mockReturnValue("new-access-token");

      const result = await authService.refreshToken(refreshToken);

      expect(mockPrismaClient.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: refreshToken },
        include: { user: true },
      });
      expect(result).toEqual({ accessToken: "new-access-token" });
    });

    it("should throw AuthenticationError for invalid token", async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken("invalid-token")).rejects.toThrow(
        "Invalid refresh token"
      );
    });
  });

  describe("changePassword", () => {
    it("should successfully change password", async () => {
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
        password: "oldHashedPassword",
      });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue("newHashedPassword");

      const result = await authService.changePassword(
        changeData.token,
        changeData.username,
        null,
        changeData.oldPassword,
        changeData.newPassword
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(changeData.oldPassword, "oldHashedPassword");
      expect(bcrypt.hash).toHaveBeenCalledWith(changeData.newPassword, 10);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: "newHashedPassword" },
      });
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(result.message).toBe("Password changed successfully");
    });

    it("should throw AuthenticationError for invalid old password", async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: "token",
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: "testuser",
        password: "hashedPassword",
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.changePassword("token", "testuser", null, "wrongpass", "NewPass123!")
      ).rejects.toThrow("Invalid old password");
    });
  });

  describe("removeUser", () => {
    it("should successfully remove user", async () => {
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
        password: "hashedPassword",
      });
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.removeUser(
        removeData.token,
        removeData.username,
        null,
        removeData.password
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(removeData.password, "hashedPassword");
      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.message).toBe("User account deleted successfully");
    });
  });

  describe("registerWithAutoLogin", () => {
    it("should register and login when auto-login is enabled", async () => {
      process.env.AUTO_LOGIN_AFTER_REGISTER = "true";

      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashedPassword");
      mockPrismaClient.user.create.mockResolvedValue({
        id: 1,
        username: "testuser",
        email: "test@example.com",
        password: "hashedPassword",
        isVerified: false,
      });
      mockPrismaClient.emailVerification.create.mockResolvedValue({});

      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");

      const result = await authService.registerWithAutoLogin(
        "testuser",
        "test@example.com",
        "Password123!"
      );

      expect(result).toHaveProperty("accessToken", "access-token");
      expect(result).toHaveProperty("refreshToken", "refresh-token");
      expect(result).toHaveProperty("autoLogin", true);
    });

    it("should only register when auto-login is disabled", async () => {
      delete process.env.AUTO_LOGIN_AFTER_REGISTER; // Ensure it's falsy

      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashedPassword");
      mockPrismaClient.user.create.mockResolvedValue({
        id: 1,
        username: "testuser",
        email: "test@example.com",
        password: "hashedPassword",
        isVerified: false,
      });
      mockPrismaClient.emailVerification.create.mockResolvedValue({});

      const result = await authService.registerWithAutoLogin(
        "testuser",
        "test@example.com",
        "Password123!"
      );

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty("accessToken");
      expect(result).not.toHaveProperty("refreshToken");
      expect(result).not.toHaveProperty("autoLogin");
      expect(result.message).toBe("Registration successful. Please check your email for verification instructions.");
    });
  });

  describe("resendVerificationEmail", () => {
    it("should successfully resend verification email", async () => {
      const email = "test@example.com";

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email,
        username: "testuser",
        isVerified: false,
        EmailVerification: {
          id: 1,
        },
      });

      const result = await authService.resendVerificationEmail(email);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { EmailVerification: true },
      });
      expect(mockPrismaClient.emailVerification.delete).toHaveBeenCalled();
      expect(mockPrismaClient.emailVerification.create).toHaveBeenCalled();
      expect(result.message).toBe("Verification email sent");
    });

    it("should throw NotFoundError for non-existent user", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.resendVerificationEmail("nonexistent@example.com")
      ).rejects.toThrow("User not found");
    });

    it("should throw ValidationError for already verified email", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        isVerified: true,
      });

      await expect(
        authService.resendVerificationEmail("test@example.com")
      ).rejects.toThrow("Email is already verified");
    });
  });
});
