/**
 * Nexafxtrade User Controller
 * Path: ./controllers/userController.js
 * Description: Logic for profile retrieval, balance sync, and referral stats.
 */
const logger = require("../utils/logger");

// 1. Fetch Operator Profile
exports.getUserProfile = async (req, res) => {
  try {
    // In production, you would fetch from MongoDB using req.user (from auth middleware)
    // const user = await User.findById(req.user);
    
    res.status(200).json({
      success: true,
      data: {
        username: "Operator_" + req.user.substring(0, 4),
        balance: 5000, // Simulated initial KES balance
        equity: 5000,
        currency: "KES"
      }
    });
  } catch (error) {
    logger.error("Profile Fetch Error", { error: error.message });
    res.status(500).json({ success: false, message: "Terminal could not retrieve profile data." });
  }
};

// 2. Update Balance (e.g., after deposit or trade)
exports.updateUserBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    logger.info(`Balance adjustment node triggered for user ${req.user}: KES ${amount}`);
    
    res.status(200).json({
      success: true,
      message: "Balance synchronized successfully.",
      newBalance: amount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Balance sync failed." });
  }
};

// 3. Get Referral Stats (10% Bonus Tracking)
exports.getReferralStats = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      referralCode: "NEXA-" + req.user.substring(0, 5).toUpperCase(),
      totalReferrals: 0,
      bonusEarned: 0 // This matches your 10% bonus logic
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Referral node unreachable." });
  }
};

// 4. Update Settings
exports.updateProfileSettings = async (req, res) => {
  res.status(200).json({ success: true, message: "Security parameters updated." });
};
