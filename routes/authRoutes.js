/**
 * Nexafxtrade Authentication Routing Node
 * Path: ./routes/auth.js
 * Description: Maps network endpoints to the Auth Controller logic.
 * Version: 3.3.0 (May 2026)
 */

const express = require("express");
const router = express.Router();

// Import Controllers 
// Note: Ensure the path matches your project structure (./controllers/auth.js)
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
 * @desc    Authenticate and grant access token
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/me
 * @desc    Fetch active operator profile parameters
 * @access  Private (Requires Auth Middleware)
 */
router.get("/me", getMe);

// ========================================
// EXPORT ROUTER ENGINE
// ========================================

module.exports = router;
