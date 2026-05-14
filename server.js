/**
 * Nexafxtrade Backend Engine
 * Version: 3.1.0 (May 2026)
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
let currentMarketRate = 0.0000;

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

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);

/**
 * REAL-TIME ENGINE (Socket.io)
 * Handles live charts, social proof chat, and the 30-second trade loop
 */
io.on("connection", (socket) => {
  console.log("New Trader Connected to Nexafxtrade");

  // 1. CHAT & SOCIAL PROOF
  socket.on("send-chat", (data) => {
    io.emit("receive-chat", {
      user: data.user,
      message: data.message,
      time: new Date().toLocaleTimeString()
    });
  });

  // 2. TRADE EXECUTION ENGINE (The "Prediction" Loop)
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
 * MARKET RATE GENERATOR (Wavy Movement)
 */
setInterval(() => {
  // Generates movement between -0.12 and 0.12
  const movement = (Math.random() * 0.24 - 0.12).toFixed(4);
  currentMarketRate = parseFloat(movement);
  
  io.emit("market-update", { rate: currentMarketRate });
}, 1000);

/**
 * MPESA CALLBACK HANDLING
 * Handles STK Push updates and the 10% Referral Bonus
 */
app.post("/api/mpesa/callback", async (req, res) => {
    const callbackData = req.body.Body.stkCallback;

    if (callbackData.ResultCode === 0) {
        const metadata = callbackData.CallbackMetadata.Item;
        const amount = metadata.find(item => item.Name === 'Amount').Value;
        const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
        
        console.log(`Nexafxtrade Deposit: KSh ${amount} confirmed for ${phone}`);
        
        // Referral Logic: 10% Bonus for the inviter
        const bonus = amount * 0.10;
        // In your real logic: Find User by Phone -> Update Balance -> Find Referrer -> Add Bonus
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
