import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!MONGODB_URI) {
  throw new Error("❌ Please define MONGODB_URI in .env");
}

/**
 * Global is used here to maintain a cached connection
 * across hot reloads in development.
 */
const globalMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached =
  globalMongoose.mongoose ??
  (globalMongoose.mongoose = {
    conn: null,
    promise: null,
  });

export async function connectDB() {
  if (cached.conn?.connection.readyState === 1) {
    return cached.conn;
  }

  if (cached.conn?.connection.readyState === 0) {
    cached.conn = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      })
      .then((instance) => instance)
      .catch(async (error) => {
        cached.promise = null;
        // One automatic retry — Atlas clusters can be slow on cold start.
        // Keep the sleep short (500 ms) so a 30-second Vercel function timeout
        // is not exhausted waiting; the real fix is whitelisting 0.0.0.0/0 in
        // MongoDB Atlas → Network Access.
        console.warn("MongoDB first connect failed, retrying in 500 ms…", error);
        await new Promise((r) => setTimeout(r, 500));
        cached.promise = mongoose
          .connect(MONGODB_URI, {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
          })
          .then((instance) => instance)
          .catch((retryError) => {
            cached.promise = null;
            throw retryError;
          });
        return cached.promise;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.conn = null;
    throw error;
  }
}
