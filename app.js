

const express = require("express");
const cors = require("cors");

const app = express();

// ─────────────────────────────────────────────
// GLOBAL MIDDLEWARES
// ─────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static assets
// Access via: http://localhost:5000/uploads/header/logo-123.png
app.use("/uploads", express.static("uploads"));

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

const headerRoutes = require("./modules/header/routes/headerRoutes");
const chatRoutes = require("./modules/chat/routes/chatRoutes");

app.use("/api/header", headerRoutes);
app.use("/api/chat", chatRoutes);

// ─────────────────────────────────────────────
// 404 HANDLER — catches any unknown route
// ─────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
    console.error("Global Error:", err.message);
    return res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});

module.exports = app;