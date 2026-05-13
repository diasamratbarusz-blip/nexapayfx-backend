const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

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
// You will need to create this route file for M-Pesa automation
const paymentRoutes = require("./routes/paymentRoutes"); 

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);

/**
 * AUTOMATED M-PESA CALLBACK (WEBHOOK)
 * This replaces manual deposit verification via WhatsApp.
 * When a user pays, Safaricom sends a request here to update the balance instantly.
 */
app.post("/api/mpesa/callback", async (req, res) => {
    const callbackData = req.body.Body.stkCallback;

    // ResultCode 0 means the transaction was successful
    if (callbackData.ResultCode === 0) {
        const metadata = callbackData.CallbackMetadata.Item;
        const amount = metadata.find(item => item.Name === 'Amount').Value;
        const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
        const receipt = metadata.find(item => item.Name === 'MpesaReceiptNumber').Value;

        console.log(`Success: Received KSh ${amount} from ${phone}. Receipt: ${receipt}`);

        // TODO: Logic to update user balance in MongoDB
        // 1. Find user by phone number
        // 2. Increment user.balance by 'amount'
        // 3. Trigger 10% referral bonus logic for the inviter
    } else {
        console.log(`Payment Failed or Cancelled: ${callbackData.ResultDesc}`);
    }

    // Always respond to Safaricom with 200 OK
    res.status(200).send("Callback Received");
});

/**
 * REAL-TIME DATA SIMULATION
 * Provides the "Rate" data for the live moving graph in image_2.png.
 */
app.get("/api/market/rate", (req, res) => {
    // Generates a fluctuating rate between -0.12 and 0.12 as seen in the image
    const currentRate = (Math.random() * 0.24 - 0.12).toFixed(4);
    res.json({ rate: parseFloat(currentRate) });
});

// Server Configuration
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Nexapaytrade server is live on port ${PORT}`);
  console.log(`Automated Callback URL: http://your-domain.com/api/mpesa/callback`);
});
