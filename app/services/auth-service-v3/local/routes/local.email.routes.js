const express = require("express");
const emailController = require("../controllers/local.email.controller.js");
const {
  resendVerificationValidation,
  verifyEmailValidation
} = require("../middleware/local.validator.js");
const { emailLimiter } = require("../middleware/local.rate-limit.js");
const { asyncHandler, handleValidationErrors } = require("../../shared-middleware/error.handler.js");


const router = express.Router();

router.get("/verify-email",
  verifyEmailValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await emailController.verifyEmail(token);
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
    const result = await emailController.resendVerificationEmail(email);
    res.json({
      success: true,
      data: result
    });
  })
);

module.exports = router;
