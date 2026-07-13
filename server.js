/**
 * Nexafxtrade Backend Engine (Vercel Serverless Premium Edition)
 * Version: 5.2.0 (Guaranteed Dashboard Data Routes Added)
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
 * ADMIN VERIFICATION MIDDLEWARE (BYPASSED ON ROOT ADMIN ENDPOINTS)
 * =========================================
 */
function adminAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: "Access denied. No token provided." });
        
        const token = header.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Invalid authorization token" });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
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
                balance: user.balance || 0
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
 * ADMINISTRATIVE INTERFACES (OPEN ACCESS - NO TOKENS REQUIRED)
 * =========================================
 */

// Admin Dashboard: Fetch all users catalog (adminAuth middleware removed)
app.get("/api/admin/users", async (req, res) => {
    try {
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });
        // Returns the array directly to perfectly align with your frontend data mapping array pipeline
        res.json(users);
    } catch (error) {
        console.error("Admin user catalog fetch error:", error);
        res.status(500).json({ error: "Failed to retrieve users" });
    }
});

// Admin Dashboard: Directly alter any user's balance remotely (adminAuth middleware removed)
app.put("/api/admin/user/balance-override", async (req, res) => {
    try {
        const { userId, targetBalance } = req.body;
        if (userId === undefined || targetBalance === undefined) {
            return res.status(400).json({ success: false, message: "userId and targetBalance required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Target user profile not found" });
        }

        user.balance = parseFloat(targetBalance);
        await user.save();

        res.json({ 
            success: true, 
            message: `User balance manually overwritten to ${user.balance}`, 
            updatedBalance: user.balance 
        });
    } catch (error) {
        console.error("Admin balance adjustment failure:", error);
        res.status(500).json({ success: false, message: "Failed to modify remote wallet balance" });
    }
});

// Admin Dashboard: Force/Override global market ticker rate (adminAuth middleware removed)
app.post("/api/admin/market/override", async (req, res) => {
    try {
        const { forcedRate } = req.body;
        if (!forcedRate) {
            return res.status(400).json({ success: false, message: "forcedRate parameter is required" });
        }

        await AdminControl.findOneAndUpdate(
            { key: "market_rate_override" },
            { value: parseFloat(forcedRate) },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: `Market trend pinned to ${forcedRate}` });
    } catch (error) {
        console.error("Market configuration save error:", error);
        res.status(500).json({ success: false, message: "Failed to pin market trend metric" });
    }
});

// Admin Dashboard: Reset market trend back to algorithmic variance (adminAuth middleware removed)
app.delete("/api/admin/market/override", async (req, res) => {
    try {
        await AdminControl.deleteOne({ key: "market_rate_override" });
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
 * MARKET RATE INTERFACES (UPDATED FOR REMOTE ADMIN CONTROL)
 * =========================================
 */
app.get("/api/market/rate", async (req, res) => {
    try {
        const override = await AdminControl.findOne({ key: "market_rate_override" });
        if (override && override.value) {
            return res.json({ rate: override.value });
        }
        
        const baseRate = 8421500; 
        const dynamicShift = (Math.random() - 0.48) * (8500 / 15);
        const currentMarketRate = Math.floor(baseRate + dynamicShift);
        res.json({ rate: currentMarketRate });
    } catch (error) {
        res.json({ rate: 8421500 });
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
