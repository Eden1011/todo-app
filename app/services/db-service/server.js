require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./middleware/error.handler.js");
const { authenticateToken } = require("./middleware/db.auth-token.js");

const app = express();

app.use(express.json());
app.use(morgan("dev"));

// API routes
const api = {
    task: require("./routes/task.routes.js"),
    category: require("./routes/category.routes.js"),
    tag: require("./routes/tag.routes.js"),
    project: require("./routes/project.routes.js"),
    notification: require("./routes/notification.routes.js"),
    export: require("./routes/export.routes.js"),
    user: require("./routes/user.routes.js"),
};

// Protected routes (require authentication via auth-service)
app.use("/api/task", authenticateToken, api.task);
app.use("/api/category", authenticateToken, api.category);
app.use("/api/tag", authenticateToken, api.tag);
app.use("/api/project", authenticateToken, api.project);
app.use("/api/notification", authenticateToken, api.notification);
app.use("/api/export", authenticateToken, api.export);
app.use("/api/user", authenticateToken, api.user);

// Health check endpoint (unprotected)
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "db-service",
        version: "1.0.0",
    });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`DB service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    if (process.env.NODE_ENV === "development") {
        console.log(`Test interface: http://localhost:${PORT}/test/dashboard`);
    }
    console.log(
        `Auth service URL: ${process.env.AUTH_SERVICE_URL || "http://localhost:3000"}`,
    );
});

module.exports = app;
