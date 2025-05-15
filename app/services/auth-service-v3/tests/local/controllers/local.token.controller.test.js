jest.mock("@prisma/client");
jest.mock("jsonwebtoken");
jest.mock("../../../utils/token.utils.js");

const mockPrismaClient = {
  refreshToken: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(() => mockPrismaClient);

const jwt = require("jsonwebtoken");
const { generateAccessToken } = require("../../../utils/token.utils.js");
const tokenController = require("../../../local/controllers/local.token.controller.js");
const { AuthenticationError, AuthorizationError } = require("../../../shared-middleware/error.custom.js");

describe("Token Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));
    process.env.REFRESH_TOKEN_SECRET = "test-refresh-token-secret";
  });

  describe("refreshToken", () => {
    it("should successfully refresh token", async () => {
      const refreshToken = "valid-refresh-token";
      const userId = 1;
      const newAccessToken = "new-access-token";

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: userId, isVerified: true }
      });

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: userId });
      });

      generateAccessToken.mockReturnValue(newAccessToken);

      const result = await tokenController.refreshToken(refreshToken);

      expect(mockPrismaClient.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: refreshToken },
        include: { user: true }
      });
      expect(jwt.verify).toHaveBeenCalledWith(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        expect.any(Function)
      );
      expect(generateAccessToken).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ accessToken: newAccessToken });
    });

    it("should throw AuthenticationError for invalid refresh token", async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      await expect(tokenController.refreshToken("invalid-token")).rejects.toThrow(
        new AuthenticationError("Invalid refresh token")
      );
    });

    it("should throw AuthorizationError for unverified email", async () => {
      const refreshToken = "valid-refresh-token";

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: refreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1, isVerified: false }
      });

      await expect(tokenController.refreshToken(refreshToken)).rejects.toThrow(
        new AuthorizationError("Email is not verified")
      );
    });

    it("should throw AuthenticationError for expired refresh token", async () => {
      const refreshToken = "expired-refresh-token";

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: refreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() - 1000), // expired
        user: { id: 1, isVerified: true }
      });

      await expect(tokenController.refreshToken(refreshToken)).rejects.toThrow(
        new AuthenticationError("Refresh token expired")
      );
      expect(mockPrismaClient.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it("should throw AuthenticationError if JWT verification fails", async () => {
      const refreshToken = "invalid-jwt-token";

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: refreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 1, isVerified: true }
      });

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error("JWT verification failed"), null);
      });

      await expect(tokenController.refreshToken(refreshToken)).rejects.toThrow(
        new AuthenticationError("Invalid refresh token")
      );
    });
  });
});
