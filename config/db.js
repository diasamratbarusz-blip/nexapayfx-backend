/**
 * Nexafxtrade Backend Engine - Database Module (Vercel Optimized)
 * File: config/db.js
 * Description: MongoDB Connection with Caching for Serverless
 * Version: 4.0.1 (Optimized for Vercel & Fixed Promise Evaluation)
 */

const mongoose = require("mongoose");

/**
 * Global is used here to maintain a cached connection across serverless 
 * function invocations. This prevents connections from growing exponentially 
 * and exhausting MongoDB Atlas limits.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // 1. Ensure MONGO_URI is actually loaded
  if (!process.env.MONGO_URI) {
    throw new Error("Database environment variable MONGO_URI is missing.");
  }

  // 2. If we already have a cached connection, reuse it instantly
  if (cached.conn) {
    return cached.conn;
  }

  // 3. If not, establish a new connection promise
  if (!cached.promise) {
    const opts = {
      autoIndex: true, // Set to false in high-traffic production if schemas are static
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,
      bufferCommands: false, // Crucial for serverless environments
    };

    // Keep the raw promise straight from mongoose
    cached.promise = mongoose.connect(process.env.MONGO_URI, opts);
  }
  
  try {
    cached.conn = await cached.promise;
    
    console.log("====================================");
    console.log(`NEXAFX DATABASE: ONLINE`);
    console.log(`Host: ${cached.conn.connection.host}`);
    console.log("Status: Connection Synchronized (Cached)");
    console.log("====================================");
    
  } catch (error) {
    cached.promise = null; // Reset promise on failure so it can retry next time
    
    console.error("====================================");
    console.error("NEXAFX DATABASE: CONNECTION FAILED");
    console.error(`Error Logic: ${error.message}`);
    console.error("====================================");

    throw new Error(`MongoDB Connection Failed: ${error.message}`);
  }

  return cached.conn;
};

module.exports = connectDB;
