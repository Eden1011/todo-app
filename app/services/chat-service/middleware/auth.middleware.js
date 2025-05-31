const axios = require("axios");

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

        const authServiceUrl =
            process.env.AUTH_SERVICE_URL || "http://localhost:3000";

        const response = await axios.post(
            `${authServiceUrl}/local/token/verify`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 5000, // 5 seconds timeout
            },
        );

        // If auth-service confirmed the token
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
        // Handle communication errors with auth-service
        if (error.response) {
            // Auth-service responded with an error
            const status = error.response.status;
            const message =
                error.response.data?.error || "Token verification failed";

            return res.status(status).json({
                success: false,
                error: message,
            });
        } else if (error.code === "ECONNREFUSED") {
            // Auth-service is not available
            console.error("Auth service is not available:", error.message);
            return res.status(503).json({
                success: false,
                error: "Authentication service unavailable",
            });
        } else if (error.code === "ECONNABORTED") {
            // Timeout
            console.error("Auth service timeout:", error.message);
            return res.status(504).json({
                success: false,
                error: "Authentication service timeout",
            });
        } else {
            // Other errors
            console.error("Auth service error:", error.message);
            return res.status(500).json({
                success: false,
                error: "Internal authentication error",
            });
        }
    }
}

/**
 * Authenticate socket connection
 * Updated to match the HTTP middleware pattern
 */
async function authenticateSocket(token) {
    try {
        const authServiceUrl =
            process.env.AUTH_SERVICE_URL || "http://localhost:3000";

        const response = await axios.post(
            `${authServiceUrl}/local/token/verify`,
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
            throw new Error("Invalid or expired token");
        }
    } catch (error) {
        console.error("Socket token verification error:", {
            message: error.message,
            code: error.code,
            response: error.response?.data,
        });
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
