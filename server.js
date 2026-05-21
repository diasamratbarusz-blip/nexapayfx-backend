/**
 * Nexafxtrade Backend Engine
 * Version: 3.3.0 (May 2026)
 * Brand: Nexafxtrade (formerly Nexapaytrade)
 * Description: Core entry point handling Socket.io, M-Pesa callbacks, and API routes.
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const logger = require("./utils/logger");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

/**
 * 1. ENHANCED CORS CONFIGURATION
 * Essential to stop the "❌ CONNECTION FAILED" error on the frontend.
 * This allows your terminal (localhost or Render) to talk to this server.
 */
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Initialize Socket.io with explicit CORS matching
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Global Market State
let currentMarketRate = 8421500; 
let forcedAdminTrend = "AUTO";   

// Database Connection Logic (Kept intact with custom logger)
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.system("MongoDB Connected Successfully"))
  .catch(err => logger.error("CRITICAL: MongoDB Connection Error:", { error: err.message }));

// Main brand identification for health check
app.get("/", (req, res) => {
  res.send("Nexafxtrade | High-Performance Trading Engine Running");
});

/**
 * 2. ROUTE BINDING
 * Ensure these files exist in your /routes folder
 */
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); 
const userRoutes = require("./routes/User"); 

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/user", userRoutes);

/**
 * 3. REAL-TIME ENGINE (Socket.io)
 */
io.on("connection", (socket) => {
  logger.info("New Trader Connected to Terminal Node", { socketId: socket.id });

  // Initial Sync
  socket.emit('admin-force-market-trend', { trend: forcedAdminTrend });
  socket.emit('market-update', { rate: currentMarketRate });

  // Chat & Social Proof Pipeline
  socket.on("send-chat", (data) => {
    io.emit("receive-chat", {
      user: data.user,
      message: data.message,
      time: new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })
    });
  });

  // Admin Overrides
  socket.on("admin-force-gateway-rate", (data) => {
    if (data && typeof data.rate === 'number') {
      currentMarketRate = Math.floor(data.rate);
      logger.warn(`Admin Override: Gateway Rate set to ${currentMarketRate}`);
      io.emit("market-update", { rate: currentMarketRate });
    }
  });

  socket.on("admin-matrix-sync", (data) => {
    if (data && data.marketTrend) {
      forcedAdminTrend = data.marketTrend;
      io.emit("admin-force-market-trend", { trend: forcedAdminTrend });
      if (data.customSpikeRate && !isNaN(data.customSpikeRate)) {
        currentMarketRate += parseFloat(data.customSpikeRate);
        io.emit("market-update", { rate: currentMarketRate });
      }
    }
  });

  socket.on("admin-force-balance", (data) => {
    if (data && data.user && typeof data.balance === 'number') {
      io.emit("admin-force-balance", { user: data.user, balance: data.balance });
    }
  });

  // 4. TRADE EXECUTION ENGINE (30-Second prediction loop)
  socket.on("place-trade", (data) => {
    const entryPrice = currentMarketRate;
    const amount = parseFloat(data.amount);
    
    logger.trade(`Trade Placed: ${data.type} KES ${amount} at ${entryPrice}`);

    setTimeout(() => {
      const exitPrice = currentMarketRate;
      let win = false;

      if (data.type === 'BUY' && exitPrice > entryPrice) win = true;
      if (data.type === 'SELL' && exitPrice < entryPrice) win = true;

      const payout = win ? (amount * 1.85) : 0; // 85% Profit

      socket.emit("trade-result", {
        status: win ? "WIN" : "LOSS",
        payout: payout.toFixed(2),
        entry: entryPrice,
        exit: exitPrice
      });

      if (win && amount >= 500) {
        io.emit("receive-chat", {
          user: "System",
          message: `🎉 User ***${socket.id.substring(0,3)} just won KES ${payout.toFixed(0)}!`
        });
      }
    }, 30000); 
  });

  socket.on("disconnect", () => {
    logger.info("Trader disconnected from terminal");
  });
});

/**
 * 5. MARKET RATE GENERATOR
 * Simulates high-volatility movement
 */
setInterval(() => {
  let dynamicShift = 0;
  if (forcedAdminTrend === "AUTO") {
    dynamicShift = (Math.random() - 0.48) * (8500 / 15);
  } else if (forcedAdminTrend === "HIGH") {
    dynamicShift = (Math.random() * (45000 / 15)) + 2000;
  } else if (forcedAdminTrend === "LOW") {
    dynamicShift = -((Math.random() * (45000 / 15)) + 2000);
  }
  
  currentMarketRate = Math.floor(currentMarketRate + dynamicShift);
  io.emit("market-update", { rate: currentMarketRate });
}, 1000);

/**
 * 6. MPESA CALLBACK HANDLING
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
    res.json({ rate: currentMarketRate });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.system(`Nexafxtrade Terminal Live at Port: ${PORT}`);
});
