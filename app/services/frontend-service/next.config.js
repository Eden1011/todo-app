/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
    },
    // Server-side environment variables for rewrites
    env: {
        AUTH_SERVICE_URL:
            process.env.AUTH_SERVICE_URL || "http://localhost:3000",
        DB_SERVICE_URL: process.env.DB_SERVICE_URL || "http://localhost:4000",
        CHAT_SERVICE_URL:
            process.env.CHAT_SERVICE_URL || "http://localhost:5000",
    },
    async rewrites() {
        return [
            // Auth service routes - Fixed to match API client expectations
            {
                source: "/api/auth/local/:path*",
                destination: `${process.env.AUTH_SERVICE_URL || "http://localhost:3000"}/local/:path*`,
            },
            {
                source: "/api/auth/oauth/:path*",
                destination: `${process.env.AUTH_SERVICE_URL || "http://localhost:3000"}/oauth/:path*`,
            },
            {
                source: "/api/auth/health",
                destination: `${process.env.AUTH_SERVICE_URL || "http://localhost:3000"}/health`,
            },
            // DB service routes
            {
                source: "/api/db/:path*",
                destination: `${process.env.DB_SERVICE_URL || "http://localhost:4000"}/api/:path*`,
            },
            {
                source: "/api/db/health",
                destination: `${process.env.DB_SERVICE_URL || "http://localhost:4000"}/health`,
            },
            // Chat service routes
            {
                source: "/api/chat/:path*",
                destination: `${process.env.CHAT_SERVICE_URL || "http://localhost:5000"}/api/:path*`,
            },
            {
                source: "/api/chat/health",
                destination: `${process.env.CHAT_SERVICE_URL || "http://localhost:5000"}/health`,
            },
            // Socket.io for chat (if needed)
            {
                source: "/socket.io/:path*",
                destination: `${process.env.CHAT_SERVICE_URL || "http://localhost:5000"}/socket.io/:path*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
