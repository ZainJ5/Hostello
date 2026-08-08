import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostello';

/**
 * Next dev reloads modules on every edit, which would open a new pool each
 * time and eventually exhaust Mongo's connection limit. Cache the promise on
 * globalThis so all reloads share one connection.
 */
let cached = globalThis._mongoose;
if (!cached) {
  cached = globalThis._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Clear the failed promise so the next request retries rather than
    // resolving the same rejection forever.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default connectDB;
