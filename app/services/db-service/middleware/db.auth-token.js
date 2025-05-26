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
                timeout: 5000, // 5 sekund timeout
            },
        );

        // Jeśli auth-service potwierdził token
        if (response.data.success && response.data.data.valid) {
            req.user = response.data.data.user;
            next();
        } else {
            return res.status(403).json({
                success: false,
                error: "Invalid or expired token",
            });
        }
    } catch (error) {
        // Obsługa błędów komunikacji z auth-service
        if (error.response) {
            // Auth-service odpowiedział z błędem
            const status = error.response.status;
            const message =
                error.response.data?.error || "Token verification failed";

            return res.status(status).json({
                success: false,
                error: message,
            });
        } else if (error.code === "ECONNREFUSED") {
            // Auth-service nie jest dostępny
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
            // Inne błędy
            console.error("Auth service error:", error.message);
            return res.status(500).json({
                success: false,
                error: "Internal authentication error",
            });
        }
    }
}

module.exports = {
    authenticateToken,
};
