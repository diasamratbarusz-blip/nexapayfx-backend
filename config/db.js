const mongoose = require("mongoose");

/**
 * =========================================
 * DATABASE CONFIGURATION (NEXAFX MASTER NODE)
 * =========================================
 * Establishes and manages the core state pathway to MongoDB.
 * Engineered with high-velocity optimizations for transaction streams and logging.
 */

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true, // Crucial for enforcing unique indexes like Transaction IDs or User email hashes
      
      /**
       * TERMINAL PRODUCTION PARAMETERS:
       * maxPoolSize: Dictates maximum concurrent sockets available to handle high-frequency requests.
       * serverSelectionTimeoutMS: Forces immediate failure flags if clusters do not respond within 5s.
       * socketTimeoutMS: Terminates inactive processing pipelines to prevent thread locks.
       * family: Restricts resolution to IPv4 for absolute network routing stability across hosting clusters.
       */
      maxPoolSize: 10, 
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000, 
      family: 4 
    });

    console.log(`✅ NexaFX Database Connected: ${conn.connection.host}`);

    // ==========================================
    // PERSISTENT RUNTIME MONITORING
    // ==========================================
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ NexaFX Database Link Terminated! Re-initializing routing engine...');
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌ NexaFX Database Runtime Exception: ${err.message}`);
    });

  } catch (error) {
    console.error("❌ NexaFX Database Handshake Failure:", error.message);

    /**
     * RETRY LOOP PIPELINE:
     * Prevents permanent container crash loops on cloud hosting platforms (like Vercel serverless limits or cold starts).
     * Automatically attempts to restore infrastructure sync every 5000ms.
     */
    console.log("🔄 Re-attempting database sync in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
