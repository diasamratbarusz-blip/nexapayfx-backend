/**
 * Nexafxtrade Backend Engine - Authentication Middleware
 * File: middleware/auth.js
 * Description: Validates JWT tokens and protects private terminal routes
 * Version: 4.0.0 (Optimized for Vercel & Unified Logging)
 * Brand: Nexafxtrade
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

      // Safety check in case the header is exactly "Bearer " with no token
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "⚠️ Authorization token is missing."
        });
      }

      // 2. Decode and verify the token against your secure secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      /**
       * 3. Attach User Data
       * We attach the decoded operator ID to the request object.
       */
      req.user = decoded.id;

      // 4. Log successful verification using our custom logger
      logger.info("Terminal access granted", { 
        operatorId: decoded.id.substring(0, 8) + "...",
        route: req.path 
      });

      // 5. Proceed to the next logic in the pipeline
      next();

    } catch (error) {
      // Catching expired or tampered tokens
      logger.warn("Terminal Security Breach: Invalid Token", { 
        error: error.message,
        ip: req.ip,
        route: req.path
      });

      return res.status(401).json({
        success: false,
        message: "❌ Security Authorization Failed. Session expired or invalid.",
      });
    }
  } else {
    // 6. Handle missing token scenario
    logger.warn("Terminal Access Denied: No Authorization Token Found", { 
      route: req.path 
    });

    return res.status(401).json({
      success: false,
      message: "⚠️ Authorization Required. Please log in to your operator node.",
    });
  }
};

module.exports = { protect };
