/**
 * Nexafxtrade User Management Routing Node
 * Path: ./routes/User.js
 * Description: Handles secure operator profile and financial data endpoints.
 * Version: 3.3.1 (Fixed Middleware Import)
 */

const express = require("express");
const router = express.Router();

// Import Security Middleware
// FIX: Removed curly braces to correctly import the default exported function
const protect = require("../middleware/auth");

// Import Controllers 
/** 
 * Note: These controllers handle the logic for fetching and updating 
 * specific operator parameters in the MongoDB matrix.
 */
const {
  getUserProfile,
  updateUserBalance,
  getReferralStats,
  updateProfileSettings
} = require("../controllers/userController");

// ========================================
// SECURE USER NODES (Requires Authorization)
// ========================================

/**
 * @route   GET /api/user/profile
 * @desc    Fetch full operator profile including balance and trade history
 * @access  Private
 */
router.get("/profile", protect, getUserProfile);

/**
 * @route   PUT /api/user/balance
 * @desc    Manually synchronize operator balance (Admin/System only)
 * @access  Private
 */
router.put("/balance", protect, updateUserBalance);

/**
 * @route   GET /api/user/referrals
 * @desc    Fetch referral matrix and 10% bonus accumulation data
 * @access  Private
 */
router.get("/referrals", protect, getReferralStats);

/**
 * @route   PUT /api/user/settings
 * @desc    Update operator security and notification parameters
 * @access  Private
 */
router.put("/settings", protect, updateProfileSettings);

// ========================================
// EXPORT ROUTER ENGINE
// ========================================

module.exports = router;
