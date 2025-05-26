const axios = require("axios");

const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3000";

/**
 * Verify token with auth-service
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} - User data if token is valid
 */
async function verifyToken(token) {
    try {
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
        throw new Error(`Token verification failed: ${error.message}`);
    }
}

/**
 * Get user info from auth-service
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - User information
 */
async function getUserInfo(token) {
    return await verifyToken(token);
}

/**
 * Check if auth-service is available
 * @returns {Promise<boolean>} - True if auth-service is available
 */
async function isAuthServiceAvailable() {
    try {
        const response = await axios.get(`${AUTH_SERVICE_URL}/health`, {
            timeout: 3000,
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

/**
 * Get auth-service health status
 * @returns {Promise<Object>} - Health status information
 */
async function getAuthServiceHealth() {
    try {
        const response = await axios.get(`${AUTH_SERVICE_URL}/health`, {
            timeout: 3000,
        });
        return {
            available: true,
            status: response.data,
            url: AUTH_SERVICE_URL,
        };
    } catch (error) {
        return {
            available: false,
            error: error.message,
            url: AUTH_SERVICE_URL,
        };
    }
}

module.exports = {
    verifyToken,
    getUserInfo,
    isAuthServiceAvailable,
    getAuthServiceHealth,
    AUTH_SERVICE_URL,
};
