/**
 * NEXAFX Logger Utility
 * Handles categorized logging for Trades, Authentication, and System Errors.
 * Version: 3.3.0 (Optimized for Vercel Serverless)
 * Brand: Nexafxtrade
 */

// Note: 'fs' and 'path' are removed because Vercel has a read-only file system.

const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
};

/**
 * Returns precise Kenyan Time (EAT) for synchronization
 */
const getTimestamp = () => {
    return new Date().toLocaleString('en-KE', { 
        timeZone: 'Africa/Nairobi',
        hour12: true 
    });
};

/**
 * Core Logger Function
 * @param {string} level - INFO, SUCCESS, WARN, ERROR
 * @param {string} message - The content to log
 * @param {object} metadata - Optional extra data (e.g., Trade ID, User Phone)
 */
const log = (level, message, metadata = {}) => {
    const timestamp = getTimestamp();
    const metaString = Object.keys(metadata).length ? ` | Data: ${JSON.stringify(metadata)}` : '';
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;

    const color = colors[level.toLowerCase()] || colors.reset;
    const coloredLog = `${color}${logEntry}${colors.reset}`;

    // Use the appropriate console method based on the level for better log filtering
    if (level.toLowerCase() === 'error') {
        console.error(coloredLog);
    } else if (level.toLowerCase() === 'warn') {
        console.warn(coloredLog);
    } else {
        console.log(coloredLog);
    }
};

const logger = {
    info: (msg, meta) => log('info', msg, meta),
    success: (msg, meta) => log('success', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    
    // Custom helper for M-Pesa STK Push & Callback Tracking
    mpesa: (msg, meta) => log('info', `[M-PESA-GATEWAY] ${msg}`, meta),
    
    // Custom helper for Trade Prediction Engine Monitoring
    trade: (msg, meta) => log('success', `[TRADE-ENGINE] ${msg}`, meta),

    // System health check log
    system: (msg, meta) => log('info', `[SYSTEM-CORE] ${msg}`, meta)
};

module.exports = logger;
