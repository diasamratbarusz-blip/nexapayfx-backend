/**
 * Nexafxtrade Auth Controller
 * File: controllers/auth.js
 * Description: Secure Registration, Login, and Profile Retrieval.
 * Version: 4.1.1 (Defensive Logging & Variable Fallbacks for Serverless)
 */
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// Helper function to prevent read-only filesystem crashes
const safeLog = (type, message, meta = {}) => {
  try {
    if (logger && typeof logger[type] === 'function') {
      logger[type](message, meta);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`, JSON.stringify(meta));
    }
  } catch (err) {
    // Fallback completely to default Vercel console logs if the logger crashes
    console.log(`[FALLBACK-${type.toUpperCase()}] ${message}`);
  }
};

// ========================================
// REGISTER USER
// ========================================
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate ALL required fields including phone
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, phone, password) are required"
      });
    }

    // Check existing user by email OR phone
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user WITH the phone number
    const user = await User.create({
      name,
      email,
      phone, 
      password: hashedPassword
    });

    // Fallback for JWT secret to prevent unhandled app crashes during deployment testing
    const secret = process.env.JWT_SECRET || "fallback_local_secret_temp";
    if (!process.env.JWT_SECRET) {
      console.warn("WARNING: JWT_SECRET environment variable is not defined in Vercel!");
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      secret,
      { expiresIn: "7d" }
    );

    safeLog("info", `New Operator Registered: ${email}`);

    // Send response
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance || 0
      }
    });

  } catch (error) {
    safeLog("error", "Registration Error", { error: error.message, email: req.body?.email });
    
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// LOGIN USER
// ========================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials" 
      });
    }

    const secret = process.env.JWT_SECRET || "fallback_local_secret_temp";
    const token = jwt.sign(
      { id: user._id },
      secret,
      { expiresIn: "7d" }
    );

    safeLog("info", `Operator Logged In: ${email}`);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance || 0
      }
    });

  } catch (error) {
    safeLog("error", "Login Error", { error: error.message, email: req.body?.email });
    
    return res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
};

// ========================================
// GET CURRENT USER
// ========================================
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id || req.user; 
    
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance || 0,
        joinedAt: user.createdAt
      }
    });

  } catch (error) {
    safeLog("error", "GetMe Error", { error: error.message, userId: req.user?.id || req.user });
    
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile"
    });
  }
};
