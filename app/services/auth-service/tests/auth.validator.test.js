const express = require("express");
const request = require("supertest");
const {
  registerValidation,
  loginValidation,
  resendVerificationValidation,
  changePasswordValidation,
  removeUserValidation,
  tokenValidation,
  logoutValidation,
  verifyEmailValidation,
} = require("../routes/auth.validator");
const { errorHandler } = require("../middleware/error.middleware");

const createTestApp = (validationMiddleware) => {
  const app = express();
  app.use(express.json());

  app.post("/test", validationMiddleware, async (req, res, next) => {
    const { validationResult } = require("express-validator");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array()
      });
    }
    res.json({ success: true, data: req.body });
  });

  app.get("/test", validationMiddleware, async (req, res, next) => {
    const { validationResult } = require("express-validator");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array()
      });
    }
    res.json({ success: true, data: req.query });
  });

  app.use(errorHandler);

  return app;
};

describe("Auth Validators", () => {
  describe("registerValidation", () => {
    let app;

    beforeEach(() => {
      app = createTestApp(registerValidation);
    });

    it("should accept valid registration data", async () => {
      const validData = {
        username: "testuser123",
        email: "test@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject username that's too short", async () => {
      const invalidData = {
        username: "ab",
        email: "test@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Username must be between 3 and 20 characters",
          path: "username",
        })
      );
    });

    it("should reject username that's too long", async () => {
      const invalidData = {
        username: "a".repeat(21),
        email: "test@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Username must be between 3 and 20 characters",
          path: "username",
        })
      );
    });

    it("should reject username with special characters", async () => {
      const invalidData = {
        username: "test@user",
        email: "test@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Username must contain only letters and numbers",
          path: "username",
        })
      );
    });

    it("should reject invalid email", async () => {
      const invalidData = {
        username: "testuser",
        email: "invalid-email",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Please provide a valid email",
          path: "email",
        })
      );
    });

    it("should reject weak password", async () => {
      const weakPasswords = [
        "password",  // no uppercase, number, special char
        "Password",  // no number, special char
        "Password1", // no special char
        "password1!", // no uppercase
        "SHORT1!",   // too short
      ];

      for (const password of weakPasswords) {
        const invalidData = {
          username: "testuser",
          email: "test@example.com",
          password,
        };

        const response = await request(app)
          .post("/test")
          .send(invalidData);

        expect(response.status).toBe(400);
      }
    });
  });

  describe("loginValidation", () => {
    let app;

    beforeEach(() => {
      app = createTestApp(loginValidation);
    });

    it("should accept valid login with username", async () => {
      const validData = {
        username: "testuser",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should accept valid login with email", async () => {
      const validData = {
        email: "test@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject missing password", async () => {
      const invalidData = {
        username: "testuser",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Password is required",
          path: "password",
        })
      );
    });

    it("should reject empty password", async () => {
      const invalidData = {
        username: "testuser",
        password: "",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Password is required",
          path: "password",
        })
      );
    });

    it("should reject invalid email format", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe("resendVerificationValidation", () => {
    let app;

    beforeEach(() => {
      app = createTestApp(resendVerificationValidation);
    });

    it("should accept valid email", async () => {
      const validData = {
        email: "test@example.com",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject invalid email", async () => {
      const invalidData = {
        email: "invalid-email",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Valid email is required",
          path: "email",
        })
      );
    });

    it("should reject missing email", async () => {
      const response = await request(app)
        .post("/test")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("changePasswordValidation", () => {
    let app;

    beforeEach(() => {
      app = createTestApp(changePasswordValidation);
    });

    it("should accept valid password change data", async () => {
      const validData = {
        token: "refresh-token",
        username: "testuser",
        oldPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject missing token", async () => {
      const invalidData = {
        username: "testuser",
        oldPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Refresh token is required",
          path: "token",
        })
      );
    });

    it("should reject missing old password", async () => {
      const invalidData = {
        token: "refresh-token",
        username: "testuser",
        newPassword: "NewPassword123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Old password is required",
          path: "oldPassword",
        })
      );
    });

    it("should reject weak new password", async () => {
      const invalidData = {
        token: "refresh-token",
        username: "testuser",
        oldPassword: "OldPassword123!",
        newPassword: "weak",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          path: "newPassword",
        })
      );
    });
  });

  describe("removeUserValidation", () => {
    let app;

    beforeEach(() => {
      app = createTestApp(removeUserValidation);
    });

    it("should accept valid remove user data", async () => {
      const validData = {
        token: "refresh-token",
        username: "testuser",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject missing token", async () => {
      const invalidData = {
        username: "testuser",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Refresh token is required",
          path: "token",
        })
      );
    });

    it("should reject missing password", async () => {
      const invalidData = {
        token: "refresh-token",
        username: "testuser",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Password is required",
          path: "password",
        })
      );
    });
  });

  describe("tokenValidation", () => {
    let app;

    beforeEach(() => {
      app = createTestApp(tokenValidation);
    });

    it("should accept valid token", async () => {
      const validData = {
        token: "refresh-token",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject missing token", async () => {
      const response = await request(app)
        .post("/test")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Refresh token is required",
          path: "token",
        })
      );
    });

    it("should reject empty token", async () => {
      const invalidData = {
        token: "",
      };

      const response = await request(app)
        .post("/test")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Refresh token is required",
          path: "token",
        })
      );
    });
  });

  describe("logoutValidation", () => {
    let app;

    beforeEach(() => {
      app = createTestApp(logoutValidation);
    });

    it("should accept valid logout data", async () => {
      const validData = {
        token: "refresh-token",
      };

      const response = await request(app)
        .post("/test")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject missing token", async () => {
      const response = await request(app)
        .post("/test")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Token is required",
          path: "token",
        })
      );
    });
  });

  describe("verifyEmailValidation", () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      app.get("/test", verifyEmailValidation, async (req, res, next) => {
        const { validationResult } = require("express-validator");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: "Validation failed",
            details: errors.array()
          });
        }
        res.json({ success: true, data: req.query });
      });

      app.use(errorHandler);
    });

    it("should accept valid token in query", async () => {
      const response = await request(app)
        .get("/test")
        .query({ token: "verification-token" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject missing token", async () => {
      const response = await request(app)
        .get("/test");

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Verification token is required",
          path: "token",
        })
      );
    });

    it("should reject empty token", async () => {
      const response = await request(app)
        .get("/test")
        .query({ token: "" });

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          msg: "Verification token is required",
          path: "token",
        })
      );
    });
  });
});
