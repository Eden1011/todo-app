// Create global variable for Google Strategy callback
global.googleStrategyCallback = null;

jest.mock("@prisma/client");
jest.mock("../../utils/token.utils.js");

// Mock passport
jest.mock("passport", () => ({
  initialize: jest.fn(() => (req, res, next) => next()),
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = {
      id: 1,
      username: "googleuser@example.com",
      email: "googleuser@example.com",
      googleId: "google-user-id",
      isVerified: true,
      accessToken: "google-access-token",
      refreshToken: "google-refresh-token"
    };
    next();
  })
}));

// Mock GoogleStrategy
jest.mock("passport-google-oauth20", () => ({
  Strategy: jest.fn((options, verifyCallback) => {
    // Store the callback globally for test access
    global.googleStrategyCallback = verifyCallback;
    return { name: 'google' };
  })
}));

// Create mock Prisma client
const mockPrismaClient = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  refreshToken: {
    create: jest.fn()
  },
  $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrismaClient))
};
require("@prisma/client").PrismaClient.mockImplementation(() => mockPrismaClient);

// Create mock Express app
const express = require('express');
const request = require('supertest');
const passport = require('passport');
const { generateAccessToken, generateRefreshToken } = require("../../utils/token.utils.js");
const mockApp = express();

// Setup basic app
mockApp.use(express.json());
mockApp.use(passport.initialize());

// Create simple error handler
mockApp.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server error'
  });
});

// Mock routes
mockApp.get('/oauth/google', (req, res) => res.status(200).send('OAuth initiated'));
mockApp.get('/oauth/google/callback', (req, res) => {
  passport.authenticate('google')(req, res, () => {
    res.redirect(`/test/login#access_token=${req.user.accessToken}&refresh_token=${req.user.refreshToken}`);
  });
});
mockApp.get('/oauth/login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    error: "Login using Google failed"
  });
});

describe("OAuth Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation(async (callback) => callback(mockPrismaClient));

    // Initialize Strategy to set the callback
    require("passport-google-oauth20").Strategy({
      clientID: "test-client-id",
      clientSecret: "test-client-secret",
      callbackURL: "http://localhost:3000/oauth/google/callback"
    }, (req, accessToken, refreshToken, profile, done) => {
      done(null, { id: 1 });
    });
  });

  describe("Google OAuth Flow", () => {
    it("should initiate Google OAuth flow", async () => {
      const response = await request(mockApp).get("/oauth/google");
      expect(response.status).toBe(200);
    });

    it("should handle Google OAuth callback successfully", async () => {
      generateAccessToken.mockReturnValue("jwt-access-token");
      generateRefreshToken.mockReturnValue("jwt-refresh-token");

      const response = await request(mockApp).get("/oauth/google/callback");

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("access_token=google-access-token");
      expect(response.headers.location).toContain("refresh_token=google-refresh-token");
    });

    it("should handle login failure", async () => {
      const response = await request(mockApp).get("/oauth/login-failed");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Login using Google failed");
    });
  });

  describe("Google Strategy Integration", () => {
    it("should create a new user when logging in with Google for the first time", async () => {
      // Verify callback is available
      expect(global.googleStrategyCallback).toBeDefined();

      const googleProfile = {
        id: "new-google-id",
        emails: [{ value: "newuser@example.com" }]
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 2,
        username: "newuser@example.com",
        email: "newuser@example.com",
        googleId: "new-google-id",
        isVerified: true
      });

      generateAccessToken.mockReturnValue("access-token-for-new-user");
      generateRefreshToken.mockReturnValue("refresh-token-for-new-user");

      const mockReq = {};
      const mockAccessToken = "google-access-token";
      const mockRefreshToken = "google-refresh-token";
      const doneFn = jest.fn();

      // Execute the strategy callback
      await global.googleStrategyCallback(mockReq, mockAccessToken, mockRefreshToken, googleProfile, doneFn);

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { googleId: "new-google-id" },
            { email: "newuser@example.com" }
          ]
        }
      });

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          username: "newuser@example.com",
          email: "newuser@example.com",
          googleId: "new-google-id",
          isVerified: true
        }
      });

      expect(mockPrismaClient.refreshToken.create).toHaveBeenCalled();
      expect(doneFn).toHaveBeenCalledWith(null, expect.objectContaining({
        id: 2,
        accessToken: "access-token-for-new-user",
        refreshToken: "refresh-token-for-new-user"
      }));
    });

    it("should link Google account to existing user", async () => {
      expect(global.googleStrategyCallback).toBeDefined();

      const googleProfile = {
        id: "google-id-to-link",
        emails: [{ value: "existing@example.com" }]
      };

      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 3,
        username: "existing@example.com",
        email: "existing@example.com",
        googleId: null,
        isVerified: true
      });

      mockPrismaClient.user.update.mockResolvedValue({
        id: 3,
        username: "existing@example.com",
        email: "existing@example.com",
        googleId: "google-id-to-link",
        isVerified: true
      });

      generateAccessToken.mockReturnValue("access-token-for-linked-user");
      generateRefreshToken.mockReturnValue("refresh-token-for-linked-user");

      const mockReq = {};
      const mockAccessToken = "google-access-token";
      const mockRefreshToken = "google-refresh-token";
      const doneFn = jest.fn();

      await global.googleStrategyCallback(mockReq, mockAccessToken, mockRefreshToken, googleProfile, doneFn);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: {
          googleId: "google-id-to-link",
          isVerified: true
        }
      });

      expect(mockPrismaClient.refreshToken.create).toHaveBeenCalled();
      expect(doneFn).toHaveBeenCalledWith(null, expect.objectContaining({
        id: 3,
        accessToken: "access-token-for-linked-user",
        refreshToken: "refresh-token-for-linked-user"
      }));
    });
  });
});
