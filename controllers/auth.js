/**
 * Nexafxtrade Auth Controller
 * File: controllers/auth.js
 * Description: Secure Registration, Login, and Profile Retrieval.
 * Version: 4.1.0 (Fixed missing phone field)
 */
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// ========================================
// REGISTER USER
// ========================================
exports.register = async (req, res) => {
  try {
    // FIX: Added 'phone' to the destructuring so we actually grab it from the frontend
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
      phone, // FIX: Now passing the phone number to the database
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
    logger.error("Registration Error", { error: error.message, email: req.body.email });
    
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

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logger.info(`Operator Logged In: ${email}`);

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
