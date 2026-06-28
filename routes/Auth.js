/**
 * Nexafxtrade Authentication Routing Node
 * File: routes/auth.js
 * Description: Maps network endpoints to the Auth Controller logic.
 * Version: 4.0.1 (Fixed Middleware Import)
 * Brand: Nexafxtrade
 */

const express = require("express");
const router = express.Router();

// Import Middleware
// FIX: Removed curly braces to correctly import the default exported function
const protect = require("../middleware/auth");

// Import Controllers 
const {
  register,
  login,
  getMe
} = require("../controllers/auth");

// ========================================
// AUTH ROUTES - PRIMARY GATEWAYS
// ========================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", register);

/**
 * @route   POST /api/auth/login
 * @desc    Login an existing user and get token
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/me
 * @desc    Get the currently logged-in user's profile
 * @access  Private (Requires the 'protect' middleware)
 */
router.get("/me", protect, getMe);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;
