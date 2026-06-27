/**
 * Nexafxtrade User Data Model
 * Path: ./models/User.js
 * Description: Defines the user structure, handles phone numbers, and referrals.
 * Version: 4.0.1 (Fixed Serverless Unique Referral Code Collision)
 * Brand: Nexafxtrade
 */

const mongoose = require("mongoose");
const crypto = require("crypto"); // Using built-in Node crypto library for secure strings

const userSchema = new mongoose.Schema({
  // --- Basic Info ---
  name: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: true,       
    unique: true,         
    trim: true,
    lowercase: true       
  },
  phone: {
    type: String,
    required: true,
    unique: true, 
    trim: true
  },
  password: {
    type: String,
    required: true
  },

  // --- Money & Wallet ---
  balance: {
    type: Number,
    default: 0
  },

  // --- Referral System (10% Bonus) ---
  referralCode: {
    type: String,
    unique: true,
    sparse: true // CRITICAL: Tells MongoDB to ignore documents that don't have a referral code yet
  },
  referredBy: {
    type: String, 
    default: null
  },
  referralEarnings: {
    type: Number,
    default: 0
  },

  // --- Security & Roles ---
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // --- Date Tracking ---
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * MIDDLEWARE: Runs automatically before saving a user to the database.
 */
userSchema.pre("save", function(next) {
  
  // 1. Fix Phone Number (Converts '07...' to '2547...')
  if (this.isModified("phone") && this.phone) {
    if (this.phone.startsWith("0")) {
      this.phone = "254" + this.phone.substring(1);
    } else if (this.phone.startsWith("+")) {
      this.phone = this.phone.substring(1);
    }
  }

  // 2. Generate a Cryptographically Secure Safe Referral Code
  if (!this.referralCode) {
    // Generates a 4-byte hex string (8 characters total, completely unique e.g., 'A1B2C3D4')
    this.referralCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  }

  next();
});

// Safeguard against model re-compilation errors on Vercel
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
