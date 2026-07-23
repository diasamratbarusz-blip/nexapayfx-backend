/**
 * Nexafxtrade Backend Engine (Vercel Serverless Premium Edition)
 * Version: 5.2.0 (Guaranteed Dashboard Data Routes Added & Admin Full Control Integrated)
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

// Schema to store admin-controlled market overrides, liquidity feeds, signals, and alerts
const AdminControlSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const AdminControl = mongoose.models.AdminControl || mongoose.model("AdminControl", AdminControlSchema);

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
        return callback(null, true); // Fallback allow for admin connections
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
        
        req.user = jwt.verify(token, process.env.JWT_SECRET || "nexafx_secret_fallback_key");
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * =========================================
 * ADMIN VERIFICATION MIDDLEWARE (BYPASSED ON ROOT ADMIN ENDPOINTS)
 * =========================================
 */
function adminAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: "Access denied. No token provided." });
        
        const token = header.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Invalid authorization token" });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "nexafx_secret_fallback_key");
        
        if (decoded.role !== "admin" && decoded.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ error: "Forbidden. Administrative privileges required." });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired administrative token" });
    }
}

/**
 * =========================================
 * MPESA CALLBACK HANDLING (PAYNECTA INTERFACES)
 * =========================================
 */
const handleMpesaCallback = async (req, res) => {
    try {
        const callbackData = req.body?.Body?.stkCallback || req.body?.data?.transaction;
        
        if (!callbackData) {
            return res.status(400).send("Invalid callback envelope structure.");
        }

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
            
            console.log(`[MPESA] Deposit Confirmed: KES ${amount} for ${phone}`);
            
            // Auto credit user wallet matching phone if found
            if (phone) {
                const cleanPhone = phone.toString().replace(/[^0-9]/g, '');
                const user = await User.findOne({ phone: new RegExp(cleanPhone.slice(-9)) });
                if (user) {
                    user.balance = (user.balance || 0) + parseFloat(amount);
                    if (!user.realBalances) user.realBalances = { USD: user.balance, EUR: 0, GBP: 0, BTC: 0 };
                    user.realBalances.USD = user.balance;
                    user.markModified('realBalances');
                    await user.save();
                }
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
 * GUARANTEED USER PROFILE & BALANCE ROUTES
 * =========================================
 */
app.get("/api/user/profile", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                balance: user.balance || 0,
                realBalances: user.realBalances || { USD: user.balance || 0, EUR: 0, GBP: 0, BTC: 0 },
                demoBalances: user.demoBalances || { USD: 37878.00, EUR: 35000.00, GBP: 30000.00, BTC: 1.5 }
            }
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ success: false, message: "Server error fetching profile" });
    }
});

app.put("/api/user/balance", auth, async (req, res) => {
    try {
        const { amount, action } = req.body;
        if (!amount || !action) {
            return res.status(400).json({ success: false, message: "Amount and action are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (action === "add") {
            user.balance = (user.balance || 0) + parseFloat(amount);
        } else if (action === "subtract") {
            if ((user.balance || 0) < parseFloat(amount)) {
                return res.status(400).json({ success: false, message: "Insufficient funds" });
            }
            user.balance = (user.balance || 0) - parseFloat(amount);
        } else {
            return res.status(400).json({ success: false, message: "Invalid action" });
        }

        if (!user.realBalances) user.realBalances = { USD: user.balance, EUR: 0, GBP: 0, BTC: 0 };
        user.realBalances.USD = user.balance;
        user.markModified('realBalances');

        await user.save();

        res.json({
            success: true,
            message: "Balance updated successfully",
            newBalance: user.balance
        });
    } catch (error) {
        console.error("Balance update error:", error);
        res.status(500).json({ success: false, message: "Server error updating balance" });
    }
});

/**
 * =========================================
 * ADMINISTRATIVE INTERFACES (FULL ADMIN OVERRIDE CONTROL)
 * =========================================
 */

// Admin Dashboard: Fetch all users catalog
app.get("/api/admin/users", async (req, res) => {
    try {
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error("Admin user catalog fetch error:", error);
        res.status(500).json({ error: "Failed to retrieve users" });
    }
});

// Admin Dashboard: Advanced Balance Transformation (Supports REAL/DEMO & Multi-currency USD, EUR, GBP, BTC)
app.put("/api/admin/user/balance-override", async (req, res) => {
    try {
        const { userId, targetBalance, amount, env, currency } = req.body;
        const targetVal = parseFloat(amount !== undefined ? amount : targetBalance);

        if (!userId || isNaN(targetVal)) {
            return res.status(400).json({ success: false, message: "userId and target balance value are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Target user profile not found" });
        }

        const selectedEnv = (env || "REAL").toUpperCase();
        const selectedCurrency = (currency || "USD").toUpperCase();

        if (selectedEnv === "REAL") {
            if (!user.realBalances) user.realBalances = { USD: user.balance || 0, EUR: 0, GBP: 0, BTC: 0 };
            user.realBalances[selectedCurrency] = targetVal;
            if (selectedCurrency === "USD") {
                user.balance = targetVal;
            }
            user.markModified('realBalances');
        } else {
            if (!user.demoBalances) user.demoBalances = { USD: 37878.00, EUR: 35000.00, GBP: 30000.00, BTC: 1.5 };
            user.demoBalances[selectedCurrency] = targetVal;
            user.markModified('demoBalances');
        }

        await user.save();

        res.json({ 
            success: true, 
            message: `User ${userId} [${selectedEnv} - ${selectedCurrency}] balance manually overwritten to ${targetVal}`, 
            user
        });
    } catch (error) {
        console.error("Admin balance adjustment failure:", error);
        res.status(500).json({ success: false, message: "Failed to modify remote wallet balance" });
    }
});

// Admin Dashboard: Force/Override global asset market pricing and spread
app.post("/api/admin/market/override", async (req, res) => {
    try {
        const { forcedRate, pair, price, spread } = req.body;
        const targetPair = pair || "EUR/USD";
        const targetPrice = parseFloat(price !== undefined ? price : forcedRate);
        const targetSpread = parseFloat(spread || 0.4);

        if (isNaN(targetPrice)) {
            return res.status(400).json({ success: false, message: "Valid price/forcedRate parameter is required" });
        }

        await AdminControl.findOneAndUpdate(
            { key: `market_override_${targetPair}` },
            { value: { price: targetPrice, spread: targetSpread, updatedAt: new Date() } },
            { upsert: true, new: true }
        );

        // Standard overall fallback override key
        await AdminControl.findOneAndUpdate(
            { key: "market_rate_override" },
            { value: targetPrice },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: `Market trend for ${targetPair} pinned to ${targetPrice} (Spread: ${targetSpread} Pips)` });
    } catch (error) {
        console.error("Market configuration save error:", error);
        res.status(500).json({ success: false, message: "Failed to pin market trend metric" });
    }
});

// Admin Dashboard: Inject trend strategy rules (HIGH, LOW, AUTO)
app.post("/api/admin/market/trend-policy", async (req, res) => {
    try {
        const { mode } = req.body;
        if (!mode) return res.status(400).json({ success: false, message: "Trend mode is required" });

        await AdminControl.findOneAndUpdate(
            { key: "market_trend_policy" },
            { value: mode.toUpperCase() },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: `Market trend behavior policy set to ${mode.toUpperCase()}` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update trend policy" });
    }
});

// Admin Dashboard: Propagate Nexa-AI Strategy Signals to User Dashboards
app.post("/api/admin/ai-signal", async (req, res) => {
    try {
        const { score, text } = req.body;
        await AdminControl.findOneAndUpdate(
            { key: "nexa_ai_signal" },
            { value: { score: score || "92.4", text: text || "Structural trend divergence maps buyer volume.", timestamp: new Date() } },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: "AI Analyst signal successfully propagated" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to push AI signal update" });
    }
});

// Admin Dashboard: Universal Broadcast System Alerts
app.post("/api/admin/broadcast", async (req, res) => {
    try {
        const { msg } = req.body;
        if (!msg) return res.status(400).json({ success: false, message: "Message is required" });

        await AdminControl.findOneAndUpdate(
            { key: "global_broadcast_alert" },
            { value: { msg, timestamp: new Date() } },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Universal broadcast alert dispatched" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to dispatch global alert" });
    }
});

// Admin Dashboard: Reset market trend back to algorithmic variance
app.delete("/api/admin/market/override", async (req, res) => {
    try {
        await AdminControl.deleteMany({ key: { $regex: /^market_override_/ } });
        await AdminControl.deleteOne({ key: "market_rate_override" });
        await AdminControl.deleteOne({ key: "market_trend_policy" });
        res.json({ success: true, message: "Market pricing reverted to standard algorithmic updates" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to clear price rule configuration" });
    }
});

/**
 * =========================================
 * ROUTE BINDING (FIXED CAPITALIZATION)
 * =========================================
 */
const authRoutes = require("./routes/Auth");         
const paymentRoutes = require("./routes/paymentRoutes"); 
const userRoutes = require("./routes/User"); 

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/user", userRoutes);

/**
 * =========================================
 * MARKET RATE INTERFACES (UPDATED FOR REMOTE ADMIN CONTROL & POLICIES)
 * =========================================
 */
app.get("/api/market/rate", async (req, res) => {
    try {
        const pair = req.query.pair || "EUR/USD";
        const pairOverride = await AdminControl.findOne({ key: `market_override_${pair}` });
        
        if (pairOverride && pairOverride.value && pairOverride.value.price) {
            return res.json({ 
                pair,
                rate: pairOverride.value.price, 
                spread: pairOverride.value.spread || 0.4 
            });
        }

        const globalOverride = await AdminControl.findOne({ key: "market_rate_override" });
        if (globalOverride && globalOverride.value) {
            return res.json({ pair, rate: globalOverride.value, spread: 0.4 });
        }
        
        const trendPolicy = await AdminControl.findOne({ key: "market_trend_policy" });
        const policyMode = trendPolicy ? trendPolicy.value : "AUTO";

        let baseRate = 1.08520;
        if (pair === "GBP/USD") baseRate = 1.26440;
        if (pair.includes("BTC")) baseRate = 61240.50;
        if (pair === "XAU/USD") baseRate = 2342.10;

        let dynamicShift = (Math.random() - 0.5) * (baseRate * 0.0004);
        if (policyMode === "HIGH") dynamicShift = Math.abs(dynamicShift) + (baseRate * 0.0001);
        if (policyMode === "LOW") dynamicShift = -Math.abs(dynamicShift) - (baseRate * 0.0001);

        const currentMarketRate = parseFloat((baseRate + dynamicShift).toFixed(pair.includes("USD") && !pair.includes("BTC") ? 5 : 2));
        res.json({ pair, rate: currentMarketRate, spread: 0.4 });
    } catch (error) {
        res.json({ pair: "EUR/USD", rate: 1.08520, spread: 0.4 });
    }
});

// Active system status & state parameters query endpoint for frontend sync
app.get("/api/market/state", async (req, res) => {
    try {
        const aiSignal = await AdminControl.findOne({ key: "nexa_ai_signal" });
        const broadcast = await AdminControl.findOne({ key: "global_broadcast_alert" });
        const trend = await AdminControl.findOne({ key: "market_trend_policy" });

        res.json({
            aiSignal: aiSignal ? aiSignal.value : null,
            broadcast: broadcast ? broadcast.value : null,
            trendPolicy: trend ? trend.value : "AUTO"
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch system state" });
    }
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
        version: "5.2.0"
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
