const AuthUtils = {
    // Token management
    getToken() {
        return localStorage.getItem("access_token");
    },

    setToken(token) {
        localStorage.setItem("access_token", token);
    },

    removeToken() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    },

    getRefreshToken() {
        return localStorage.getItem("refresh_token");
    },

    setRefreshToken(token) {
        localStorage.setItem("refresh_token", token);
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    },

    // Token expiration check (JWT tokens contain expiration info)
    isTokenExpired(token = null) {
        const accessToken = token || this.getToken();
        if (!accessToken) return true;

        try {
            // Decode JWT payload (simple base64 decode)
            const payload = JSON.parse(atob(accessToken.split(".")[1]));
            const currentTime = Date.now() / 1000;

            // Check if token is expired (with 30 second buffer)
            return payload.exp < currentTime + 30;
        } catch (error) {
            console.error("Error checking token expiration:", error);
            return true;
        }
    },

    // Refresh token if needed
    async refreshTokenIfNeeded() {
        if (!this.isAuthenticated()) {
            throw new Error("Not authenticated");
        }

        if (this.isTokenExpired()) {
            try {
                const response = await API.refreshToken();
                if (response.success) {
                    this.setToken(response.data.accessToken);
                    return response.data.accessToken;
                } else {
                    throw new Error("Token refresh failed");
                }
            } catch (error) {
                console.error("Token refresh failed:", error);
                this.removeToken();
                throw error;
            }
        }

        return this.getToken();
    },

    // Get user info from token
    getUserFromToken(token = null) {
        const accessToken = token || this.getToken();
        if (!accessToken) return null;

        try {
            const payload = JSON.parse(atob(accessToken.split(".")[1]));
            return {
                id: payload.id,
                exp: payload.exp,
                iat: payload.iat,
            };
        } catch (error) {
            console.error("Error parsing token:", error);
            return null;
        }
    },

    // Logout and clear all auth data
    async logout() {
        try {
            await API.logout();
        } catch (error) {
            console.error("Logout API call failed:", error);
        } finally {
            this.removeToken();
        }
    },

    // Setup automatic token refresh
    setupTokenRefresh() {
        // Check token every 5 minutes
        setInterval(
            async () => {
                if (this.isAuthenticated() && this.isTokenExpired()) {
                    try {
                        await this.refreshTokenIfNeeded();
                    } catch (error) {
                        console.error("Automatic token refresh failed:", error);
                        // Redirect to login or show notification
                        window.location.reload();
                    }
                }
            },
            5 * 60 * 1000,
        ); // 5 minutes
    },

    // Enhanced fetch wrapper that handles token refresh
    async authenticatedFetch(url, options = {}) {
        try {
            // Ensure we have a valid token
            const token = await this.refreshTokenIfNeeded();

            const headers = {
                "Content-Type": "application/json",
                ...options.headers,
                Authorization: `Bearer ${token}`,
            };

            const response = await fetch(url, {
                ...options,
                headers,
            });

            // If token is invalid, try refreshing once more
            if (response.status === 401) {
                try {
                    const newToken = await API.refreshToken();
                    if (newToken.success) {
                        this.setToken(newToken.data.accessToken);

                        // Retry the original request with new token
                        headers.Authorization = `Bearer ${newToken.data.accessToken}`;
                        return await fetch(url, { ...options, headers });
                    }
                } catch (refreshError) {
                    console.error("Token refresh failed on 401:", refreshError);
                    this.removeToken();
                    throw new Error("Authentication failed");
                }
            }

            return response;
        } catch (error) {
            console.error("Authenticated fetch failed:", error);
            throw error;
        }
    },
};

// Initialize token refresh on load
if (typeof window !== "undefined") {
    AuthUtils.setupTokenRefresh();
}
