/**
 * Nexafxtrade User Controller
 * Path: ./controllers/userController.js
 * Description: Logic for profile retrieval, balance sync, and referral stats.
 * Version: 3.3.0 (May 2026)
 */
const User = require("../models/User");
const logger = require("../utils/logger");

// 1. Fetch Operator Profile
exports.getUserProfile = async (req, res) => {
  try {
    /**
     * req.user is populated by the protect middleware 
     * which decodes the JWT token.
     */
    const user = await User.findById(req.user).select("-password");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Operator node not found in database." 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance || 0,
        currency: "KES",
        joinedAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error("Profile Fetch Error", { error: error.message, userId: req.user });
    res.status(500).json({ 
        success: false, 
        message: "Terminal could not retrieve profile data." 
    });
  }
};

// 2. Update Balance (Internal logic for trades/deposits)
exports.updateUserBalance = async (req, res) => {
  try {
    const { amount, action } = req.body; // action: 'add' or 'subtract'
    
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (action === 'add') {
        user.balance += parseFloat(amount);
    } else if (action === 'subtract') {
        if (user.balance < amount) return res.status(400).json({ message: "Insufficient liquidity" });
        user.balance -= parseFloat(amount);
    }

    await user.save();

    logger.info(`Balance adjustment node triggered for user ${req.user}: KES ${amount} (${action})`);
    
    res.status(200).json({
      success: true,
      message: "Balance synchronized successfully.",
      newBalance: user.balance
    });
  } catch (error) {
    logger.error("Balance Update Error", { error: error.message });
    res.status(500).json({ success: false, message: "Balance sync failed." });
  }
};

// 3. Get Referral Stats (10% Bonus Tracking)
exports.getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    
    /**
     * Referral logic matches your M-Pesa 10% bonus requirement.
     * We generate a code based on the operator's ID.
     */
    res.status(200).json({
      success: true,
      referralCode: user.name.split(' ')[0].toUpperCase() + req.user.substring(req.user.length - 4),
      totalReferrals: user.referralCount || 0,
      bonusEarned: user.referralBonus || 0 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Referral node unreachable." });
  }
};

// 4. Update Settings (Security & Profile)
exports.updateProfileSettings = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user, { name, phone }, { new: true });
    
    res.status(200).json({ 
        success: true, 
        message: "Security parameters updated.",
        data: { name: user.name, phone: user.phone }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
};
