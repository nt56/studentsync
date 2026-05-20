import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

// ===========================
// CACHED MONGODB CLIENT
// ===========================
// Reuse the same MongoClient across hot-reloads (dev) and warm serverless
// invocations (prod). Without this, every cold-start opens a new connection
// that competes with mongoose and can stall while Atlas wakes from auto-pause.

const globalWithMongo = globalThis as typeof globalThis & {
  _betterAuthMongoClient?: MongoClient;
};

function getMongoClient(): MongoClient {
  if (!globalWithMongo._betterAuthMongoClient) {
    globalWithMongo._betterAuthMongoClient = new MongoClient(
      process.env.MONGODB_URI!,
      {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxPoolSize: 5,
      },
    );
  }
  return globalWithMongo._betterAuthMongoClient;
}

const client = getMongoClient();
const db = client.db();

const localhostHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function normalizeUrl(value?: string) {
  return value?.trim().replace(/\/$/, "") || undefined;
}

function isLocalUrl(value?: string) {
  if (!value) {
    return false;
  }

  try {
    return localhostHosts.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

const vercelUrl = normalizeUrl(
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
);
const betterAuthUrl = normalizeUrl(process.env.BETTER_AUTH_URL);
const publicAppUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
const configuredUrls = [betterAuthUrl, publicAppUrl, vercelUrl].filter(
  (value): value is string => Boolean(value),
);

const baseURL =
  process.env.NODE_ENV === "production"
    ? configuredUrls.find((url) => !isLocalUrl(url)) ||
      vercelUrl ||
      publicAppUrl ||
      betterAuthUrl ||
      "http://localhost:3000"
    : betterAuthUrl || publicAppUrl || vercelUrl || "http://localhost:3000";

const trustedOrigins = Array.from(
  new Set(
    configuredUrls.filter(
      (url) => process.env.NODE_ENV !== "production" || !isLocalUrl(url),
    ),
  ),
);

if (process.env.NODE_ENV !== "production") {
  trustedOrigins.push("http://localhost:3000");
}

export const auth = betterAuth({
  database: mongodbAdapter(db),

  // Base URL for Better Auth — critical for OAuth callbacks and cookie security.
  // In production, prefer a non-localhost URL even if a local dev value was
  // accidentally left in env settings.
  baseURL,

  // Trust requests from our own app URL (needed for Postman/API testing)
  trustedOrigins,

  // ===========================
  // EMAIL & PASSWORD AUTH
  // ===========================
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false, // Set to true in production
  },

  // ===========================
  // OAUTH PROVIDERS
  // ===========================
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  // ===========================
  // USER FIELDS
  // ===========================
  // SECURITY: role is NEVER user-input.
  // Every new user is always "student".
  // Only an admin can promote users to "organizer" or "admin".
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: false, // LOCKED: users cannot set their own role
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },
});

// Export auth types for use in API routes
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
