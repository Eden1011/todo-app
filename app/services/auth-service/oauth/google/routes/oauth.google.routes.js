const express = require("express");
const passport = require("../config/passport/oauth.google.strategy.js");
const crypto = require("crypto");

const router = express.Router();

router.get("/google", (req, res, next) => {
    const state = crypto.randomBytes(16).toString("hex");
    passport.authenticate("google", {
        session: false, // JWT session instead
        scope: ["profile", "email"],
        state,
    })(req, res, next);
});

router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/oauth/login-failed",
    }),
    (req, res) => {
        const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3001";
        res.redirect(
            `${frontendUrl}/#access_token=${req.user.accessToken}&refresh_token=${req.user.refreshToken}`,
        );
    },
);

router.get("/login-failed", (_, res) => {
    res.status(401).json({
        success: false,
        error: "Login using Google failed",
    });
});

module.exports = router;
