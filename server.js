/**
 * Nexafxtrade Backend Engine (Vercel Serverless Edition)
 * Version: 4.0.0 (Optimized for Vercel)
 * Brand: Nexafxtrade
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const logger = require("./utils/logger");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

/**
 * 1. ENHANCED CORS CONFIGURATION
 */
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Database Connection Logic
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.system("MongoDB Connected Successfully"))
  .catch(err => logger.error("CRITICAL: MongoDB Connection Error:", { error: err.message }));

// Main brand identification for health check
app.get("/", (req, res) => {
  res.send("Nexafxtrade | High-Performance Trading Engine Running on Vercel");
});

/**
 * 2. ROUTE BINDING
 */
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); 
const userRoutes = require("./routes/User"); 

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/user", userRoutes);

/**
 * 3. MPESA CALLBACK HANDLING
 */
app.post("/api/mpesa/callback", async (req, res) => {
    try {
        const callbackData = req.body.Body.stkCallback;
        if (callbackData.ResultCode === 0) {
            const metadata = callbackData.CallbackMetadata.Item;
            const amount = metadata.find(item => item.Name === 'Amount').Value;
            const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
            
            logger.mpesa(`Deposit Confirmed: KES ${amount} for ${phone}`);
            // Logic for balance update and 10% referral bonus should be triggered here
        } 
        res.status(200).send("OK");
    } catch (err) {
        logger.error("M-Pesa Callback processing failed", { error: err.message });
        res.status(500).send("Error");
    }
});

// Fallback API for market rate
app.get("/api/market/rate", (req, res) => {
    // Since setInterval doesn't work on Vercel, we generate a random rate on the fly
    const baseRate = 8421500; 
    const dynamicShift = (Math.random() - 0.48) * (8500 / 15);
    const currentMarketRate = Math.floor(baseRate + dynamicShift);
    res.json({ rate: currentMarketRate });
});

/**
 * 4. EXPORT FOR VERCEL (CRITICAL)
 * Vercel requires you to EXPORT the app. 
 * DO NOT use server.listen() on Vercel!
 */
module.exports = app;
