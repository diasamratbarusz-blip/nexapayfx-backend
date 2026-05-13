const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http"); // Required for Socket.io
const { Server } = require("socket.io"); // Required for Socket.io

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app); // Wrap express app in HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your frontend to connect
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Main brand identification for Nexapaytrade
app.get("/", (req, res) => {
  res.send("Nexapaytrade | Automated Trading Backend Running");
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
 * This handles the live moving graph and the chat box for image_2.png
 */
io.on("connection", (socket) => {
  console.log("A user connected to Nexapaytrade live services");

  // Handle Live Chat Messages
  socket.on("send-chat", (data) => {
    // Broadcast message to all connected users
    io.emit("receive-chat", {
      user: data.user,
      message: data.message,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/**
 * GRAPH DATA GENERATOR
 * Sends a new rate every 1 second to all users for the moving graph
 */
setInterval(() => {
  // Generates rate between -0.12 and 0.12 to match the graph scale
  const currentRate = (Math.random() * 0.24 - 0.12).toFixed(4);
  io.emit("market-update", { rate: parseFloat(currentRate) });
}, 1000);

/**
 * AUTOMATED M-PESA CALLBACK (WEBHOOK)
 */
app.post("/api/mpesa/callback", async (req, res) => {
    const callbackData = req.body.Body.stkCallback;

    if (callbackData.ResultCode === 0) {
        const metadata = callbackData.CallbackMetadata.Item;
        const amount = metadata.find(item => item.Name === 'Amount').Value;
        const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
        const receipt = metadata.find(item => item.Name === 'MpesaReceiptNumber').Value;

        console.log(`Success: Received KSh ${amount} from ${phone}. Receipt: ${receipt}`);
        
        // Logic for 10% referral bonus and balance update goes here
    } else {
        console.log(`Payment Failed: ${callbackData.ResultDesc}`);
    }
    res.status(200).send("Callback Received");
});

// Server Configuration
const PORT = process.env.PORT || 5000;
// CRITICAL: Change app.listen to server.listen so Sockets work!
server.listen(PORT, () => {
  console.log(`Nexapaytrade server is live on port ${PORT}`);
});
