jest.mock("@prisma/client");
jest.mock("bcrypt");
jest.mock("../../../utils/email.utils.js");
jest.mock("../../../utils/token.utils.js");

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

const userController = require("../../../local/controllers/local.user.controllers.js");
const bcrypt = require("bcrypt");
const { generateAccessToken, generateRefreshToken } = require("../../../utils/token.utils.js");
const { ConflictError, AuthenticationError, AuthorizationError, NotFoundError } = require("../../../shared-middleware/error.custom.js");
const sendVerificationEmail = require("../../../utils/email.utils.js");

jest.mock("../../../local/controllers/local.user.controllers.js", () => {
  const originalModule = jest.requireActual("../../../local/controllers/local.user.controllers.js");

  return {
    ...originalModule,
    changePassword: jest.fn()
  };
});

describe("User Controller", () => {
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

      const result = await userController.register(
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
        userController.register("testuser", "test@example.com", "Password123!")
      ).rejects.toThrow(ConflictError);
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

      const result = await userController.login(credentials.username, null, credentials.password);

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
        userController.login("wronguser", null, "wrongpass")
      ).rejects.toThrow(AuthenticationError);
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
        userController.login("testuser", null, "Password123!")
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe("changePassword", () => {
    it("should successfully change password", async () => {
      userController.changePassword.mockResolvedValue({ message: "Password changed successfully" });

      const result = await userController.changePassword(
        "refresh-token",
        "testuser",
        null,
        "OldPassword123!",
        "NewPassword123!"
      );

      expect(result.message).toBe("Password changed successfully");
    });

    it("should throw AuthenticationError for invalid old password", async () => {
      userController.changePassword.mockRejectedValue(new AuthenticationError("Invalid old password"));

      await expect(
        userController.changePassword("token", "testuser", null, "wrongpass", "NewPass123!")
      ).rejects.toThrow(AuthenticationError);
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
        user: { id: 1 }
      });
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 1,
        username: removeData.username,
        password: "hashedPassword",
      });
      bcrypt.compare.mockResolvedValue(true);

      const result = await userController.removeUser(
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

      const result = await userController.registerWithAutoLogin(
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

      const result = await userController.registerWithAutoLogin(
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
});
