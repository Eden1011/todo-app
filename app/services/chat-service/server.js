require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

// Import middleware
const { authenticateToken } = require("./middleware/auth.middleware");
const {
    errorHandler,
    notFound,
    asyncHandler,
} = require("./middleware/error-handler.middleware");
const { generalLimiter } = require("./middleware/rate-limit.middleware");

// Import socket handler
const { initializeSocket } = require("./socket/chat.socket");

const { autoCreateProjectChat } = require("./controllers/chat.controller");

// Import routes
const chatRoutes = require("./routes/chat.routes");
const messageRoutes = require("./routes/message.routes");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:3001",
        credentials: true,
    }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// Apply general rate limiting
app.use(generalLimiter);

// Health check endpoint (unprotected)
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "chat-service",
        version: "1.0.0",
        database:
            mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
});

// API auto-create db-service -> chat-service unprotected route
app.post("/api/chats/auto-create", asyncHandler(autoCreateProjectChat));

// API routes (protected)
app.use("/api/chats", authenticateToken, chatRoutes);
app.use("/api/messages", authenticateToken, messageRoutes);

// Socket.IO info endpoint
app.get("/socket/info", (req, res) => {
    res.json({
        success: true,
        data: {
            connectedClients: io.sockets.sockets.size,
            supportedEvents: [
                "join_project",
                "leave_project",
                "send_message",
                "edit_message",
                "delete_message",
                "typing_start",
                "typing_stop",
                "get_online_users",
            ],
            authenticationRequired: true,
            instructions: {
                connection:
                    "Connect with JWT token in auth header or query parameter",
                rooms: "Join project rooms using join_project event with projectId",
                messaging:
                    "Send messages using send_message event with chatId and content",
            },
        },
    });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\nReceived SIGINT. Graceful shutdown...");

    try {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log("MongoDB connection closed");

        // Close HTTP server
        server.close(() => {
            console.log("HTTP server closed");
            process.exit(0);
        });
    } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
    }
});

// Start server
async function startServer() {
    try {
        // Connect to database
        await connectToDatabase();

        // Start HTTP server
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`Chat service running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Socket.IO endpoint: ws://localhost:${PORT}`);
            console.log(`Socket info: http://localhost:${PORT}/socket/info`);
            console.log(
                `Environment: ${process.env.NODE_ENV || "development"}`,
            );
            console.log(`MongoDB: ${process.env.MONGODB_URI}`);
            console.log(`Auth Service: ${process.env.AUTH_SERVICE_URL}`);
            console.log(`DB Service: ${process.env.DB_SERVICE_URL}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = { app, server, io };
