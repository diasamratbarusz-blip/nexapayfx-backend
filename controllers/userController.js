/**
 * Nexafxtrade User Controller
 * Path: ./controllers/userController.js
 * Description: Logic for profile retrieval, balance sync, and referral stats.
 * Version: 4.0.0 (Optimized for Vercel & Financial Safety)
 */
const User = require("../models/User");
const logger = require("../utils/logger");

// 1. Fetch Operator Profile
exports.getUserProfile = async (req, res) => {
  try {
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

// 2. Update Balance (Atomic Operation for Trading/Deposits)
exports.updateUserBalance = async (req, res) => {
  try {
    const { amount, action } = req.body; 
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount provided." });
    }

    let updateQuery;
    let searchQuery = { _id: req.user };

    if (action === 'add') {
        // Atomically increase balance
        updateQuery = { $inc: { balance: parsedAmount } };
    } else if (action === 'subtract') {
        // Ensure user has enough balance BEFORE subtracting (Atomic check)
        searchQuery.balance = { $gte: parsedAmount }; 
        updateQuery = { $inc: { balance: -parsedAmount } };
    } else {
        return res.status(400).json({ success: false, message: "Invalid action type." });
    }

    // Execute atomic update
    const user = await User.findOneAndUpdate(searchQuery, updateQuery, { new: true });

    if (!user) {
        if (action === 'subtract') {
            return res.status(400).json({ success: false, message: "Insufficient liquidity or user not found." });
        }
        return res.status(404).json({ success: false, message: "User not found." });
    }

    logger.info(`Balance adjustment node triggered for user ${req.user}: KES ${parsedAmount} (${action})`);
    
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
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    // Fallback to "USER" if name doesn't have a space
    const firstName = user.name.split(' ')[0].toUpperCase();
    const codeSuffix = req.user.substring(req.user.length - 4);

    res.status(200).json({
      success: true,
      referralCode: `${firstName}${codeSuffix}`,
      totalReferrals: user.referralCount || 0,
      bonusEarned: user.referralBonus || 0 
    });
  } catch (error) {
    logger.error("Referral Stats Error", { error: error.message });
    res.status(500).json({ success: false, message: "Referral node unreachable." });
  }
};

// 4. Update Settings (Security & Profile)
exports.updateProfileSettings = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user, { name, phone }, { new: true, runValidators: true });
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({ 
        success: true, 
        message: "Security parameters updated.",
        data: { name: user.name, phone: user.phone }
    });
  } catch (error) {
    logger.error("Profile Update Error", { error: error.message });
    res.status(500).json({ success: false, message: "Update failed." });
  }
};
