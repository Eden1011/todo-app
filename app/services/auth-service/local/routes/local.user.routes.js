const express = require("express");
const userController = require("../controllers/local.user.controllers.js")
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  removeUserValidation,
  logoutValidation,
} = require("../middleware/local.validator.js");
const { registerLimiter, loginLimiter } = require("../middleware/local.rate-limit.js");
const { asyncHandler, handleValidationErrors } = require("../../shared-middleware/error.handler.js");

const router = express.Router();

router.post("/register",
  registerLimiter,
  registerValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const result = await userController.registerWithAutoLogin(username, email, password);
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
    const result = await userController.login(username, email, password);
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
    const result = await userController.changePassword(token, username, email, oldPassword, newPassword);
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
    await userController.logout(token);
    res.sendStatus(204);
  })
);

router.delete("/remove-user",
  removeUserValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token, username, email, password } = req.body;
    const result = await userController.removeUser(token, username, email, password);
    res.json({
      success: true,
      data: result
    });
  })
);

module.exports = router;
