/**
 * Nexafxtrade Backend Engine (Vercel Version)
 * Path: ./server.js
 * Version: 4.0.0 (Made for Vercel)
 * Brand: Nexafxtrade
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

// Load Environment Configuration
dotenv.config();

// Initialize Express
const app = express();

// Middleware (Allows frontend to talk to backend)
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// ========================================
// ROUTE REGISTRATION (Your API Links)
// ========================================
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/User");
const paymentRoutes = require("./routes/paymentRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/payments", paymentRoutes);

// Main Health Check (Shows the app is online)
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "Online", 
    terminal: "Nexafxtrade Engine v4.0.0",
    region: "KE-NBO"
  });
});

// ========================================
// MPESA GATEWAY CALLBACK
// ========================================
app.post("/api/mpesa/callback", async (req, res) => {
    try {
        const callbackData = req.body.Body.stkCallback;
        if (callbackData.ResultCode === 0) {
            const metadata = callbackData.CallbackMetadata.Item;
            const amount = metadata.find(item => item.Name === 'Amount').Value;
            const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
            
            logger.mpesa(`Payment Confirmed: KES ${amount} from ${phone}`);
            // Add your 10% referral bonus logic here later
        } 
        res.status(200).send("OK");
    } catch (error) {
        logger.error("M-Pesa Callback Error", { error: error.message });
        res.status(500).send("Error");
    }
});

// Fallback API for market rate (Since Vercel cannot run 1-second timers, 
// the frontend will need to calculate the moving numbers)
app.get("/api/market/rate", (req, res) => {
    const baseRate = 8421500; 
    const shift = (Math.random() - 0.48) * (8000 / 15);
    const currentMarketRate = Math.floor(baseRate + shift);
    
    res.json({ rate: currentMarketRate });
});

// ========================================
// EXPORT FOR VERCEL (CRITICAL STEP)
// ========================================
// We DO NOT use server.listen() on Vercel. 
// We just export the app so Vercel can run it.
module.exports = app;
