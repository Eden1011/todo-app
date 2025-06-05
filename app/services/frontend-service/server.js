const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API proxy endpoints (optional - for handling CORS if needed)
app.use("/api/auth", (req, res) => {
    // Proxy to auth service
    res.json({ message: "Use direct API calls to http://localhost:3000" });
});

app.use("/api/db", (req, res) => {
    // Proxy to db service
    res.json({ message: "Use direct API calls to http://localhost:4000" });
});

app.use("/api/chat", (req, res) => {
    // Proxy to chat service
    res.json({ message: "Use direct API calls to http://localhost:5000" });
});

// Serve React app
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Frontend service running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the application`);
});
