const express = require("express")
const router = express.Router()

// Import Controllers
const {
  register,
  login,
  getMe
} = require("../controllers/authController")

// ========================================
// AUTH ROUTES
// ========================================

// Register User
// POST /api/auth/register
router.post("/register", register)

// Login User
// POST /api/auth/login
router.post("/login", login)

// Get Current Logged In User
// GET /api/auth/me
router.get("/me", getMe)

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router
