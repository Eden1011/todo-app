const express = require("express");
const tokenController = require("../controllers/local.token.controller.js");
const { authenticateToken } = require("../middleware/local.auth-token.js");
const { tokenValidation } = require("../middleware/local.validator.js")
const { asyncHandler, handleValidationErrors } = require("../../shared-middleware/error.handler.js");

const router = express.Router();

router.post("/token",
  tokenValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const result = await tokenController.refreshToken(token);
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
