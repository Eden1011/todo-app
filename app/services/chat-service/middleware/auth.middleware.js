const axios = require("axios");
const jwt = require("jsonwebtoken");

const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3000";

/**
 * Middleware to authenticate JWT tokens via auth-service
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authorization token required",
            });
        }

        // Verify token with auth-service
        const response = await axios.post(
            `${AUTH_SERVICE_URL}/local/token/verify`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            },
        );

        if (response.data.success && response.data.data.valid) {
            req.user = response.data.data.user;
            req.token = token;
            next();
        } else {
            return res.status(403).json({
                success: false,
                error: "Invalid or expired token",
            });
        }
    } catch (error) {
        console.error("Token verification error:", error.message);

        if (error.response) {
            const status = error.response.status;
            const message =
                error.response.data?.error || "Token verification failed";
            return res.status(status).json({
                success: false,
                error: message,
            });
        } else if (error.code === "ECONNREFUSED") {
            return res.status(503).json({
                success: false,
                error: "Authentication service unavailable",
            });
        } else if (error.code === "ECONNABORTED") {
            return res.status(504).json({
                success: false,
                error: "Authentication service timeout",
            });
        } else {
            return res.status(500).json({
                success: false,
                error: "Internal authentication error",
            });
        }
    }
}

/**
 * Authenticate socket connection
 */
async function authenticateSocket(token) {
    try {
        // Verify token with auth-service
        const response = await axios.post(
            `${AUTH_SERVICE_URL}/local/token/verify`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            },
        );

        if (response.data.success && response.data.data.valid) {
            return response.data.data.user;
        } else {
            throw new Error("Invalid token");
        }
    } catch (error) {
        console.error("Socket token verification error:", error.message);
        throw new Error("Authentication failed");
    }
}

/**
 * Extract token from socket handshake
 */
function extractTokenFromSocket(socket) {
    // Try to get token from auth header
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const tokenFromQuery =
        socket.handshake.auth?.token || socket.handshake.query?.token;
    if (tokenFromQuery) {
        return tokenFromQuery;
    }

    return null;
}

module.exports = {
    authenticateToken,
    authenticateSocket,
    extractTokenFromSocket,
};
