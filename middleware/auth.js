// ================= IMPORTS =================
const jwt = require("jsonwebtoken");

/**
 * =========================================
 * AUTHENTICATION MIDDLEWARE (NEXAFX GATEWAY)
 * =========================================
 * This middleware safeguards restricted routes by validating the JWT token.
 * It ensures only authorized operator sessions can interact with the trade engine.
 */
module.exports = function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // ================= CHECK HEADER =================
    // Verifies that the client transmission included an Authorization header
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Access denied. Security handshake missing authorization header."
      });
    }

    // ================= EXTRACT TOKEN =================
    // Expected incoming structure: "Bearer <token>"
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token corrupt or missing from transmission channel."
      });
    }

    // ================= VERIFY TOKEN =================
    // Validates backend environmental integrity before verifying signatures
    if (!process.env.JWT_SECRET) {
      console.error("CRITICAL ERROR: JWT_SECRET variable is unassigned in .env context.");
      return res.status(500).json({ error: "Internal node authentication misconfiguration." });
    }

    /**
     * VERIFICATION PIPELINE
     * Cryptographically checks signature authenticity and decodes the active payload.
     * The decrypted token structure must yield operator parameters for terminal authorization.
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: "Invalid token structure. Authorization payload rejected."
      });
    }

    // ================= ATTACH OPERATOR CONTEXT =================
    /** * The decoded payload populates:
     * { id: user._id, email: user.email, phone: user.phone, role: user.role }
     * This session injection is required by downstream Node Access Control layers.
     */
    req.user = decoded;

    // Advance execution matrix to target controller
    next();

  } catch (err) {
    // Specific intercept for expired tokens to allow cleaner frontend re-authentication loops
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            error: "Operator session has expired. Re-authenticate access vault."
        });
    }

    console.error("GATEWAY AUTH ERROR:", err.message);
    return res.status(401).json({
      success: false,
      error: "Session verification exception. Please refresh credentials."
    });
  }
};
