/**
 * Nexafxtrade User Data Model
 * Path: ./models/User.js
 * Description: Defines the architectural schema for platform operators.
 * Includes automated referral generation and phone normalization middleware.
 * Version: 3.3.0 (May 2026)
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // --- Basic Identification Node ---
  name: {
    type: String,
    required: false,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true, // Critical: Prevents duplicate account mapping
    trim: true
  },
  password: {
    type: String,
    required: true
  },

  // --- Financial Status Parameters ---
  balance: {
    type: Number,
    default: 0
  },

  // --- Referral Ecosystem (10% Bonus Logic Hooks) ---
  referralCode: {
    type: String,
    unique: true,
    default: function() {
      // Generates a unique 6-character alphanumeric identifier
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  referredBy: {
    type: String, // Stores the unique referralCode of the inviter
    default: null
  },
  referralEarnings: {
    type: Number,
    default: 0
  },

  // --- System Role & Security Flags ---
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // --- Temporal Tracking ---
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * MIDDLEWARE: PHONE NORMALIZATION
 * Automatically converts local Kenyan prefixes to international standards.
 * Transforms '07...' to '2547...' and strips '+' signs before database commit.
 */
userSchema.pre("save", function(next) {
  if (this.isModified("phone")) {
    if (this.phone.startsWith("0")) {
      this.phone = "254" + this.phone.substring(1);
    } else if (this.phone.startsWith("+")) {
      this.phone = this.phone.substring(1);
    }
  }
  next();
});

// Safeguard against model re-compilation errors during hot-reloads
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
