/**
 * Nexafxtrade User Data Model
 * Path: ./models/User.js
 * Description: Defines the user structure, handles phone numbers, and referrals.
 * Version: 4.0.0 (Fixed missing email & safer referral codes)
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // --- Basic Info ---
  name: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: true,       // Required because our login/register uses email
    unique: true,         // No two users can have the same email
    trim: true,
    lowercase: true       // Automatically makes emails lowercase to prevent duplicates
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
    unique: true
    // Note: We generate this in the middleware below to prevent duplicates
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
  if (this.isModified("phone")) {
    if (this.phone.startsWith("0")) {
      this.phone = "254" + this.phone.substring(1);
    } else if (this.phone.startsWith("+")) {
      this.phone = this.phone.substring(1);
    }
  }

  // 2. Generate a Safe Referral Code (If one doesn't exist yet)
  if (!this.referralCode) {
    // Creates a random 8-character code (much safer than 6 characters)
    this.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  next();
});

// Safeguard against model re-compilation errors on Vercel
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
