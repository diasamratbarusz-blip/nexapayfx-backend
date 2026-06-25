const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Import your custom logger

/**
 * @route   POST /api/payments/create-checkout-session
 * @desc    Create a payment session (Mock logic for now)
 * @access  Public (or add 'protect' if users must be logged in to pay)
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { amount, currency } = req.body;

        // 1. Validation
        if (!amount) {
            return res.status(400).json({ 
                success: false, 
                message: "Amount is required" 
            });
        }

        // 2. Log the attempt (So you can see it in Vercel)
        logger.info(`Checkout session requested`, { 
            amount: amount, 
            currency: currency || 'KES' 
        });

        // 3. Mock response 
        // (Later, you will replace this with real Stripe/PayPal/M-Pesa logic)
        res.status(200).json({
            success: true,
            message: "Payment route hit successfully!",
            clientSecret: "pi_mock_secret_12345", // This is fake data for now
            amount: amount
        });

    } catch (error) {
        // 4. Log the real error privately for debugging
        logger.error("Checkout Session Error", { error: error.message });
        
        // 5. Send a safe, generic message to the user
        res.status(500).json({ 
            success: false, 
            message: "Failed to create checkout session. Please try again." 
        });
    }
});

// Export the router
module.exports = router;
