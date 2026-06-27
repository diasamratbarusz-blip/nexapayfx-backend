/**
 * Nexafxtrade Backend Engine (Vercel Serverless Premium Edition)
 * Version: 5.0.0 (Synchronized Structure)
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
const logger = require("./utils/logger");

// ================= MODELS =================
const User = require("./models/User");

const app = express();

/**
 * =========================================
 * MIDDLEWARE & CONFIGURATION
 * =========================================
 */
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Match Vercel preview environments dynamically
        if (/\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }

        // Match primary production domain
        if (/nexafxtrade\.com$/.test(origin)) {
            return callback(null, true);
        }
        
        // Allowed development environments
        const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:5000",
            "http://localhost:3001",
            "http://127.0.0.1:5500"
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true
}));

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
        res.status(500).json({ error: "Database connectivity error." });
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
 * MPESA CALLBACK HANDLING (PAYNECTA INTERFACES)
 * =========================================
 */
const handleMpesaCallback = async (req, res) => {
    try {
        // Support both direct Safaricom objects and wrapped custom events
        const callbackData = req.body?.Body?.stkCallback || req.body?.data?.transaction;
        
        if (!callbackData) {
            return res.status(400).send("Invalid callback envelope structure.");
        }

        // Processing codes based on transmission source
        const resultCode = callbackData.ResultCode !== undefined ? callbackData.ResultCode : 0;

        if (resultCode === 0) {
            let amount, phone;

            if (callbackData.CallbackMetadata) {
                const metadata = callbackData.CallbackMetadata.Item;
                amount = metadata.find(item => item.Name === 'Amount')?.Value;
                phone = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
            } else {
                amount = callbackData.amount;
                phone = callbackData.mobile_number || callbackData.phone;
            }
            
            // Clean log safety wrappers
            if (logger && typeof logger.mpesa === 'function') {
                logger.mpesa(`Deposit Confirmed: KES ${amount} for ${phone}`);
            } else {
                console.log(`[MPESA] Deposit Confirmed: KES ${amount} for ${phone}`);
            }
        } 
        res.status(200).send("OK");
    } catch (err) {
        console.error("M-Pesa Callback processing failed:", err.message);
        res.status(500).send("Error");
    }
};

app.get("/api/mpesa/callback", (req, res) => {
    res.status(200).json({ status: "active", message: "M-Pesa node streaming interface active." });
});
app.post("/api/mpesa/callback", handleMpesaCallback);

/**
 * =========================================
 * ROUTE BINDING
 * =========================================
 */
const authRoutes = require("./routes/auth");         
const paymentRoutes = require("./routes/paymentRoutes"); 
const userRoutes = require("./routes/user"); 

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/user", userRoutes);

/**
 * =========================================
 * MARKET RATE INTERFACES
 * =========================================
 */
app.get("/api/market/rate", (req, res) => {
    const baseRate = 8421500; 
    const dynamicShift = (Math.random() - 0.48) * (8500 / 15);
    const currentMarketRate = Math.floor(baseRate + dynamicShift);
    res.json({ rate: currentMarketRate });
});

/**
 * =========================================
 * STATIC ROUTES & SERVER STANDUP
 * =========================================
 */
app.get("/", (req, res) => {
    res.json({ 
        status: "online", 
        brand: "Nexafxtrade",
        message: "High-Performance Trading Engine Running on Vercel Serverless Architecture.",
        version: "5.0.0"
    });
});

app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/favicon.png", (req, res) => res.status(204).end());

// ================= VERCEL EXPORT CONFIGURATION =================
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 NEXAFXTRADE RUNNING MANUALLY ON PORT ${PORT}`));
}

module.exports = app;
