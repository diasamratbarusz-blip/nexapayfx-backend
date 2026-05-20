/**
 * NEXAFX Logger Utility
 * Handles categorized logging for Trades, Authentication, and System Errors.
 */

const fs = require('fs');
const path = require('path');

// Ensure log directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
};

const getTimestamp = () => {
    return new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
};

/**
 * Core Logger Function
 * @param {string} level - INFO, SUCCESS, WARN, ERROR
 * @param {string} message - The content to log
 * @param {object} metadata - Optional extra data (e.g., Trade ID, User Phone)
 */
const log = (level, message, metadata = {}) => {
    const timestamp = getTimestamp();
    const metaString = Object.keys(metadata).length ? ` | Meta: ${JSON.stringify(metadata)}` : '';
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;

    // 1. Log to Console with Colors
    const color = colors[level.toLowerCase()] || colors.reset;
    console.log(`${color}${logEntry}${colors.reset}`);

    // 2. Log to File (Persistent storage)
    const fileName = `${level.toLowerCase()}.log`;
    fs.appendFile(path.join(logDir, fileName), logEntry + '\n', (err) => {
        if (err) console.error('Failed to write to log file:', err);
    });
};

const logger = {
    info: (msg, meta) => log('info', msg, meta),
    success: (msg, meta) => log('success', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    
    // Custom helper for M-Pesa Tracking
    mpesa: (msg, meta) => log('info', `[M-PESA] ${msg}`, meta),
    
    // Custom helper for Trade Monitoring
    trade: (msg, meta) => log('success', `[TRADE] ${msg}`, meta)
};

module.exports = logger;
