const express = require("express");
const authService = require("../services/auth.service");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  registerValidation,
  loginValidation,
  resendVerificationValidation,
  changePasswordValidation,
  removeUserValidation,
  tokenValidation,
  logoutValidation,
  verifyEmailValidation
} = require("./auth.validator.js");
const { registerLimiter, loginLimiter, emailLimiter } = require("./auth.ratelimit.js");
const { asyncHandler, handleValidationErrors } = require("../middleware/error.middleware");

const router = express.Router();

router.post("/register",
  registerLimiter,
  registerValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const result = await authService.registerWithAutoLogin(username, email, password);
    res.status(201).json({
      success: true,
      data: result
    });
  })
);

router.post("/login",
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const result = await authService.login(username, email, password);
    res.json({
      success: true,
      data: result
    });
  })
);

router.get("/verify-email",
  verifyEmailValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await authService.verifyEmail(token);
    res.json({
      success: true,
      data: result
    });
  })
);

router.post("/resend-verification",
  emailLimiter,
  resendVerificationValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.resendVerificationEmail(email);
    res.json({
      success: true,
      data: result
    });
  })
);

router.post("/change-password",
  changePasswordValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token, username, email, oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(token, username, email, oldPassword, newPassword);
    res.json({
      success: true,
      data: result
    });
  })
);


router.post("/token",
  tokenValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const result = await authService.refreshToken(token);
    res.json({
      success: true,
      data: result
    });
  })
);

router.delete("/logout",
  logoutValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    await authService.logout(token);
    res.sendStatus(204);
  })
);

router.delete("/remove-user",
  removeUserValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token, username, email, password } = req.body;
    const result = await authService.removeUser(token, username, email, password);
    res.json({
      success: true,
      data: result
    });
  })
);

router.post("/verify", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      valid: true,
      user: req.user
    }
  });
});

module.exports = router;
