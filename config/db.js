/**
 * Nexafxtrade Backend Engine - Database Module (Vercel Optimized)
 * File: config/db.js
 * Description: MongoDB Connection with Caching for Serverless
 * Version: 4.0.0 (Optimized for Vercel)
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
  // 1. If we already have a cached connection, reuse it instantly (No lag!)
  if (cached.conn) {
    return cached.conn;
  }

  // 2. If not, establish a new connection
  if (!cached.promise) {
    const opts = {
      autoIndex: true, 
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,
      bufferCommands: false, // Crucial for serverless environments
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
    
    console.log("====================================");
    console.log(`NEXAFX DATABASE: ONLINE`);
    console.log(`Host: ${cached.conn.connection.host}`);
    console.log("Status: Connection Synchronized (Cached)");
    console.log("====================================");
    
  } catch (error) {
    cached.promise = null; // Reset promise on failure so it can retry
    
    console.error("====================================");
    console.error("NEXAFX DATABASE: CONNECTION FAILED");
    console.error(`Error Logic: ${error.message}`);
    console.error("====================================");

    // Throw error instead of process.exit(1) for serverless safety
    throw new Error("MongoDB Connection Failed");
  }

  return cached.conn;
};

// Exporting terminal synchronization module
module.exports = connectDB;
