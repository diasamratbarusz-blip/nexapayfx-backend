/**
 * Nexafxtrade Backend Engine - Database Module
 * File: config/db.js
 * Description: MongoDB Connection with Mongoose
 * Version: 3.2.0 (May 2026)
 */

const mongoose = require("mongoose");

/**
 * Initialize MongoDB Connection
 * Configured for high-availability Atlas clusters
 */
const connectDB = async () => {
  try {
    // Establishing connection to terminal database node
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern driver configurations
      autoIndex: true, 
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
      socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
    });

    // Success terminal notification
    console.log("====================================");
    console.log(`NEXAFX DATABASE: ONLINE`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Node Name: ${conn.connection.name}`);
    console.log("Status: Connection Synchronized");
    console.log("====================================");

    // Listen for connection drops after initial success
    mongoose.connection.on('error', err => {
      console.error(`[CRITICAL] MongoDB Post-Connection Error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log(' [WARN] MongoDB Disconnected. Attempting to re-synchronize...');
    });

  } catch (error) {
    // Error notification for terminal initialization
    console.log("====================================");
    console.error("NEXAFX DATABASE: CONNECTION FAILED");
    console.error(`Error Logic: ${error.message}`);
    console.log("====================================");

    // Exit application process with failure code
    process.exit(1);
  }
};

// Exporting terminal synchronization module
module.exports = connectDB;
