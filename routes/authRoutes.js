/**
 * Nexafxtrade Authentication Routing Node
 * Path: ./routes/auth.js
 * Description: Maps network endpoints to the Auth Controller logic.
 * Version: 3.3.0 (May 2026)
 * Brand: Nexafxtrade (formerly Nexapaytrade)
 */

const express = require("express");
const router = express.Router();

// Import Middleware
// This protects private nodes from unauthorized access
const { protect } = require("../middleware/auth");

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
 * @desc    Initialize new user terminal node
 * @access  Public
 */
router.post("/register", register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate operator and grant access token
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/me
 * @desc    Fetch active operator profile parameters
 * @access  Private (Requires protect middleware)
 */
// Added 'protect' here to ensure only logged-in users can see their profile
router.get("/me", protect, getMe);

// ========================================
// EXPORT ROUTER ENGINE
// ========================================

module.exports = router;
