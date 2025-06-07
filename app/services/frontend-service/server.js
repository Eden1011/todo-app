const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", (req, res) => {
    res.json({ message: "Use direct API calls to http://localhost:3000" });
});

app.use("/api/db", (req, res) => {
    res.json({ message: "Use direct API calls to http://localhost:4000" });
});

app.use("/api/chat", (req, res) => {
    res.json({ message: "Use direct API calls to http://localhost:5000" });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Frontend service running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the application`);
});
