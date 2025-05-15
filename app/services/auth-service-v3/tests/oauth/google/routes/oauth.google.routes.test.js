const express = require("express");
const request = require("supertest");
const passport = require("passport");
const crypto = require("crypto");

// Create mock modules
jest.mock("passport");
jest.mock("crypto");

// Create express app with direct route handlers
const app = express();
app.use(express.json());

// Create simple error handler middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

// Mock passport authenticate
const mockAuthFn = jest.fn().mockImplementation((req, res, next) => {
  if (req.path === "/google/callback") {
    req.user = { accessToken: "access-token", refreshToken: "refresh-token" };
  }
  next();
});

passport.authenticate.mockImplementation(() => mockAuthFn);

// Mock crypto.randomBytes
crypto.randomBytes.mockImplementation(() => ({
  toString: jest.fn().mockReturnValue("random-state")
}));

// Define explicit routes for testing
app.get('/google', (req, res) => {
  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
    state: crypto.randomBytes(16).toString('hex')
  })(req, res, () => {
    res.status(200).send('OAuth initiated');
  });
});

app.get('/google/callback', (req, res) => {
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login-failed'
  })(req, res, () => {
    res.redirect(`/test/login#access_token=${req.user.accessToken}&refresh_token=${req.user.refreshToken}`);
  });
});

app.get('/login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    error: "Login using Google failed"
  });
});

// Add the error handler to the app
app.use(errorHandler);

describe("Google OAuth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /google", () => {
    it("should initialize Google OAuth flow", async () => {
      const response = await request(app).get("/google");

      expect(crypto.randomBytes).toHaveBeenCalled();
      expect(passport.authenticate).toHaveBeenCalledWith(
        "google",
        expect.objectContaining({
          session: false,
          scope: ['profile', 'email']
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /google/callback", () => {
    it("should handle successful authentication callback", async () => {
      const response = await request(app).get("/google/callback");

      expect(passport.authenticate).toHaveBeenCalledWith(
        "google",
        expect.objectContaining({
          session: false,
          failureRedirect: '/login-failed'
        })
      );
      expect(response.status).toBe(302); // Redirect status
      expect(response.headers.location).toBe(
        "/test/login#access_token=access-token&refresh_token=refresh-token"
      );
    });
  });

  describe("GET /login-failed", () => {
    it("should return 401 with error message", async () => {
      const response = await request(app).get("/login-failed");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: "Login using Google failed"
      });
    });
  });
});
