/**
 * Nexafxtrade Backend Engine - Authentication Middleware
 * File: middleware/auth.js
 * Description: Validates JWT tokens and protects private terminal routes
 * Version: 3.2.0 (May 2026)
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
      // Extract token from Bearer string
      token = req.headers.authorization.split(" ")[1];

      // Decode and verify the token against your secure key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the decoded operator ID to the request object
      // This allows later routes to know exactly which user is trading
      req.user = decoded.id;

      // Log successful verification for security tracking
      logger.info(`Terminal access granted to node: ${decoded.id.substring(0, 8)}...`);

      // Proceed to the next logic in the pipeline
      next();
    } catch (error) {
      logger.error("Terminal Security Breach: Invalid Token Attempt", {
        error: error.message,
      });

      return res.status(401).json({
        success: false,
        message: "❌ Security Authorization Failed. Token Invalid.",
      });
    }
  }

  // If no token is provided at all
  if (!token) {
    logger.warn("Terminal Access Denied: No Authorization Token Found");
    return res.status(401).json({
      success: false,
      message: "⚠️ Authorization Required. Please log in to your node.",
    });
  }
};

module.exports = { protect };
