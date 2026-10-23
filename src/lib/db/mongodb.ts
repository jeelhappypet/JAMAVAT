import mongoose from "mongoose";
import { runMigrations } from "@/lib/db/migrate";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __jamavatMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__jamavatMongoose ?? { conn: null, promise: null };
globalThis.__jamavatMongoose = cache;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI નથી — .env.local માં MongoDB Atlas connection string ઉમેરો");
  }

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    // One-time data migrations run before anything reads, on every cold start —
    // one query to find they are all done, then nothing (see runMigrations).
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        // A serverless instance serves one request at a time, so a big pool
        // only costs handshakes it will never use.
        maxPoolSize: 5,
        minPoolSize: 0,
        // Fail fast instead of hanging a staff screen for half a minute when
        // the cluster is unreachable; the screen shows its error and retries.
        serverSelectionTimeoutMS: 8000,
      })
      .then(async (connected) => {
        await runMigrations(connected.connection.db!);
        return connected;
      })
      .catch((error) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
