/**
 * Nexafxtrade Backend Engine - Authentication Middleware
 * File: middleware/auth.js
 * Description: Validates JWT tokens and protects private terminal routes
 * Version: 3.2.0 (May 2026)
 * Brand: Nexafxtrade (formerly Nexapaytrade)
 */

const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

/**
 * Protect Gatekeeper Middleware
 * Checks for the presence and validity of a Bearer Token
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 1. Extract token from Bearer string
      token = req.headers.authorization.split(" ")[1];

      // 2. Decode and verify the token against your secure secret key
      // The secret must match what is used in your login controller
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      /**
       * 3. Attach User Data
       * We attach the decoded operator ID to the request object.
       * This allows all following routes (like /api/user/balance) 
       * to know exactly which operator is making the request.
       */
      req.user = decoded.id;

      // Log successful verification for terminal security tracking
      console.log(`[AUTH] Terminal access granted to operator: ${decoded.id.substring(0, 8)}...`);

      // 4. Proceed to the next logic in the pipeline
      next();
    } catch (error) {
      // Catching expired or tampered tokens
      console.error("====================================");
      console.error("TERMINAL SECURITY BREACH: INVALID TOKEN");
      console.error(`Error Logic: ${error.message}`);
      console.error("====================================");

      return res.status(401).json({
        success: false,
        message: "❌ Security Authorization Failed. Session expired or invalid.",
      });
    }
  }

  // 5. Handle missing token scenario
  if (!token) {
    console.warn("[WARN] Terminal Access Denied: No Authorization Token Found");
    return res.status(401).json({
      success: false,
      message: "⚠️ Authorization Required. Please log in to your operator node.",
    });
  }
};

module.exports = { protect };
