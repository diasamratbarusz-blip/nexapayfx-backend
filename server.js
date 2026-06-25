/**
 * Nexafxtrade Backend Engine (Vercel Serverless Edition)
 * Version: 4.1.0 (Fixed double DB connection & route names)
 * Brand: Nexafxtrade
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const logger = require("./utils/logger");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to Database (This uses the smart caching file we fixed earlier)
connectDB();

const app = express();

/**
 * 1. BASIC SETUP
 */
// Allow frontend to talk to backend
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Allow app to read JSON data
app.use(express.json());

// Main page health check
app.get("/", (req, res) => {
  res.send("Nexafxtrade | High-Performance Trading Engine Running on Vercel");
});

/**
 * 2. ROUTE BINDING
 * (Make sure these names match the actual files in your 'routes' folder!)
 */
const authRoutes = require("./routes/auth");         // Changed from authRoutes to auth
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

/**
 * 4. MARKET RATE API
 */
app.get("/api/market/rate", (req, res) => {
    // Since Vercel goes to sleep, we just calculate a random rate when asked
    const baseRate = 8421500; 
    const dynamicShift = (Math.random() - 0.48) * (8500 / 15);
    const currentMarketRate = Math.floor(baseRate + dynamicShift);
    res.json({ rate: currentMarketRate });
});

/**
 * 5. EXPORT FOR VERCEL (CRITICAL)
 * DO NOT use server.listen() on Vercel!
 */
module.exports = app;
