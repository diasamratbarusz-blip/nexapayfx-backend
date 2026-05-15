const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Basic Identification
  name: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: true,
    unique: true, // Prevents duplicate accounts
    trim: true
  },
  password: {
    type: String,
    required: true
  },

  // Financial Status
  balance: {
    type: Number,
    default: 0
  },

  // Referral System (For your 10% bonus logic)
  referralCode: {
    type: String,
    unique: true,
    default: function() {
      // Generates a random 6-character code if not provided
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  referredBy: {
    type: String, // Stores the referral code of the person who invited them
    default: null
  },
  referralEarnings: {
    type: Number,
    default: 0
  },

  // Status & Security
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Middleware: Ensure phone numbers are stored in a consistent format
 * (e.g., 254...)
 */
userSchema.pre("save", function(next) {
  if (this.phone.startsWith("0")) {
    this.phone = "254" + this.phone.substring(1);
  } else if (this.phone.startsWith("+")) {
    this.phone = this.phone.substring(1);
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
