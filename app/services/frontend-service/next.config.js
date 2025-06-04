/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
    },
    env: {
        AUTH_SERVICE_URL:
            process.env.AUTH_SERVICE_URL || "http://localhost:3000",
        DB_SERVICE_URL: process.env.DB_SERVICE_URL || "http://localhost:4000",
        CHAT_SERVICE_URL:
            process.env.CHAT_SERVICE_URL || "http://localhost:5000",
    },
    async rewrites() {
        return [
            {
                source: "/api/auth/:path*",
                destination: `${process.env.AUTH_SERVICE_URL || "http://localhost:3000"}/:path*`,
            },
            {
                source: "/api/db/:path*",
                destination: `${process.env.DB_SERVICE_URL || "http://localhost:4000"}/api/:path*`,
            },
            {
                source: "/api/chat/:path*",
                destination: `${process.env.CHAT_SERVICE_URL || "http://localhost:5000"}/api/:path*`,
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
