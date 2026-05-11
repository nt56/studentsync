import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

// MongoDB client for Better Auth adapter
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db),

  // Base URL for Better Auth (required for CSRF origin checks)
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Trust requests from our own app URL (needed for Postman/API testing)
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    // Auto-trust Vercel deployment URLs (VERCEL_URL is set automatically by Vercel)
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],

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
