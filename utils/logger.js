/**
 * NEXAFX Logger Utility
 * Handles categorized logging for Trades, Authentication, and System Errors.
 * Version: 3.2.0 (May 2026)
 * Brand: Nexafxtrade
 */

const fs = require('fs');
const path = require('path');

// Ensure log directory exists in the root folder
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

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

    // 1. Log to Console with Colors for easier Terminal debugging
    const color = colors[level.toLowerCase()] || colors.reset;
    console.log(`${color}${logEntry}${colors.reset}`);

    // 2. Log to File (Persistent storage for audits)
    const fileName = `${level.toLowerCase()}.log`;
    fs.appendFile(path.join(logDir, fileName), logEntry + '\n', (err) => {
        if (err) {
            // Fallback if file system is read-only (common in some hosting)
            console.error('\x1b[31m[CRITICAL] Log Write Failed:\x1b[0m', err.message);
        }
    });
};

const logger = {
    info: (msg, meta) => log('info', msg, meta),
    success: (msg, meta) => log('success', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    
    // Custom helper for M-Pesa STK Push & Callback Tracking
    mpesa: (msg, meta) => log('info', `[M-PESA-GATEWAY] ${msg}`, meta),
    
    // Custom helper for Trade Predicition Engine Monitoring
    trade: (msg, meta) => log('success', `[TRADE-ENGINE] ${msg}`, meta),

    // System health check log
    system: (msg, meta) => log('info', `[SYSTEM-CORE] ${msg}`, meta)
};

module.exports = logger;
