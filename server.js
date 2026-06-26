/**
 * Nexafxtrade Backend Engine (Vercel Serverless Edition)
 * Version: 4.2.0 (Fixed file name mismatches)
 * Brand: Nexafxtrade
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const logger = require("./utils/logger");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to Database safely
connectDB().catch(err => {
    console.error("Database connection failed:", err.message);
});

const app = express();

/**
 * 1. BASIC SETUP
 */
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Main page health check
app.get("/", (req, res) => {
  res.send("Nexafxtrade | High-Performance Trading Engine Running on Vercel");
});

/**
 * 2. ROUTE BINDING (FIXED TO MATCH YOUR GITHUB FILES EXACTLY)
 */
// Using Auth.js (Capital A) because that is what exists in your folder
const authRoutes = require("./routes/Auth");         
const paymentRoutes = require("./routes/paymentRoutes"); 
// Using User.js (Capital U) because that is what exists in your folder
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
        } 
        res.status(200).send("OK");
    } catch (err) {
        logger.error("M-Pesa Callback processing failed", { error: err.message });
        res.status(500).send("Error");
    }
});

/**
 * 4. MARKET RATE API
 */
app.get("/api/market/rate", (req, res) => {
    const baseRate = 8421500; 
    const dynamicShift = (Math.random() - 0.48) * (8500 / 15);
    const currentMarketRate = Math.floor(baseRate + dynamicShift);
    res.json({ rate: currentMarketRate });
});

/**
 * 5. EXPORT FOR VERCEL
 */
module.exports = app;
