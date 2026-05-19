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
        serverSelectionTimeoutMS: 10000,
      })
      .then((instance) => instance)
      .catch((error) => {
        cached.promise = null;
        throw error;
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
