/**
 * Nexafxtrade Auth Controller
 * Path: ./controllers/authController.js
 * Description: Secure Registration, Login, and Profile Retrieval.
 * Version: 4.0.0 (Security Hardened for Vercel)
 */
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger"); // Added for consistent Vercel logging

// ========================================
// REGISTER USER
// ========================================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // Hash password (Cost 10 is optimal for serverless to prevent CPU timeouts)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logger.info(`New Operator Registered: ${email}`);

    // Send response
    res.status(201).json({
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
    // Log the actual error to Vercel Dashboard for debugging
    logger.error("Registration Error", { error: error.message, email: req.body.email });
    
    // SECURITY FIX: Do not expose internal error messages to the client
    res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
};

// ========================================
// LOGIN USER
// ========================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user (Explicitly select password in case it's hidden by default in the schema)
    const user = await User.findOne({ email }).select("+password");

    // SECURITY FIX: Generic message to prevent User Enumeration attacks
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    // SECURITY FIX: Same generic message if password is wrong
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logger.info(`Operator Logged In: ${email}`);

    // Send response
    res.status(200).json({
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
    logger.error("Login Error", { error: error.message, email: req.body.email });
    
    res.status(500).json({
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
    // Note: We use req.user.id || req.user to ensure compatibility 
    // regardless of how your auth middleware attaches the decoded token.
    const userId = req.user.id || req.user; 
    
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
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
    logger.error("GetMe Error", { error: error.message, userId: req.user.id || req.user });
    
    res.status(500).json({
      success: false,
      message: "Server error fetching profile"
    });
  }
};
