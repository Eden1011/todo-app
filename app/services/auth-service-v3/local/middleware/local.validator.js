const { body, validationResult, query } = require("express-validator");

const registerValidation = [
  body("username")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .isAlphanumeric()
    .withMessage("Username must contain only letters and numbers")
    .trim()
    .escape(),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .trim(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"),
];

const loginValidation = [
  body("username").optional().trim().escape(),
  body("email").optional().isEmail().normalizeEmail().trim(),
  body("password").notEmpty().withMessage("Password is required"),
];

const resendVerificationValidation = [
  body("email").isEmail().normalizeEmail().trim().withMessage("Valid email is required"),
];

const changePasswordValidation = [
  body("token").notEmpty().withMessage("Refresh token is required"),
  body("username").optional().trim().escape(),
  body("email").optional().isEmail().normalizeEmail().trim(),
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"),
];

const removeUserValidation = [
  body("token").notEmpty().withMessage("Refresh token is required"),
  body("username").optional().trim().escape(),
  body("email").optional().isEmail().normalizeEmail().trim(),
  body("password").notEmpty().withMessage("Password is required"),
];

const tokenValidation = [
  body("token").notEmpty().withMessage("Refresh token is required"),
];

const logoutValidation = [
  body("token").notEmpty().withMessage("Token is required"),
];

const verifyEmailValidation = [
  query("token").notEmpty().withMessage("Verification token is required"),
];

module.exports = {
  registerValidation,
  loginValidation,
  resendVerificationValidation,
  changePasswordValidation,
  removeUserValidation,
  tokenValidation,
  logoutValidation,
  verifyEmailValidation,
};
