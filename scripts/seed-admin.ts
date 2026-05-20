/**
 * ============================================================
 * ADMIN SEED SCRIPT
 * ============================================================
 *
 * This script creates the FIRST admin user for the system.
 * Admin accounts can ONLY be created through this script or
 * by another admin promoting a user via the API.
 *
 * HOW IT WORKS:
 * 1. Creates a Better Auth user (email/password)
 * 2. Updates the Better Auth user's role to "admin" in the database
 * 3. Creates the corresponding MongoDB User document with role="admin"
 *
 * IMPORTANT: The role must be set in BOTH collections:
 * - Better Auth's "user" collection (so session.user.role returns "admin")
 * - Our MongoDB User collection (for extended user data)
 *
 * USAGE:
 *   npx tsx scripts/seed-admin.ts
 *
 * ENVIRONMENT VARIABLES (set in .env):
 *   ADMIN_EMAIL     - Admin email address (default: admin@example.com)
 *   ADMIN_PASSWORD  - Admin password (default: Admin@1234)
 *   ADMIN_FIRST_NAME - Admin first name (default: Super)
 *   ADMIN_LAST_NAME  - Admin last name (default: Admin)
 *   MONGODB_URI     - MongoDB connection string (required)
 *   NEXT_PUBLIC_APP_URL - App URL (default: http://localhost:3000)
 *
 * NOTE:
 * - The Next.js dev server MUST be running before executing this script,
 *   because it calls the Better Auth sign-up API endpoint.
 * - If the admin already exists, the script will promote them to admin.
 * ============================================================
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Admin credentials from environment (with safe defaults for development)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || "Super";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || "Admin";
const MONGODB_URI = process.env.MONGODB_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ===========================
// User Schema (inline to avoid module resolution issues)
// ===========================
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["student", "organizer", "admin"],
      default: "student",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    dateOfBirth: { type: Date },
    phone: { type: String },
    bio: { type: String },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
    authUserId: { type: String },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

// ===========================
// MAIN SEED FUNCTION
// ===========================
async function seedAdmin() {
  console.log("\n========================================");
  console.log("   ADMIN SEED SCRIPT");
  console.log("========================================\n");

  // 1. Validate environment
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env file");
    process.exit(1);
  }

  console.log(`📧 Admin Email:    ${ADMIN_EMAIL}`);
  console.log(`👤 Admin Name:     ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`);
  console.log(`🌐 App URL:        ${APP_URL}`);
  console.log("");

  // 2. Connect to MongoDB
  console.log("🔌 Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  // 3. Check if admin already exists in MongoDB User collection
  const existingUser = await User.findOne({ email: ADMIN_EMAIL });
  if (existingUser) {
    console.log(
      `ℹ️  User ${ADMIN_EMAIL} found. Ensuring admin role in both collections...`,
    );

    // Update MongoDB User document
    if (existingUser.role !== "admin") {
      existingUser.role = "admin";
      await existingUser.save();
      console.log("✅ MongoDB User role updated to admin");
    } else {
      console.log("✓  MongoDB User already has admin role");
    }

    // Always update Better Auth user collection to ensure consistency
    const betterAuthUserCollection = mongoose.connection.collection("user");
    const result = await betterAuthUserCollection.updateOne(
      { email: ADMIN_EMAIL },
      { $set: { role: "admin" } },
    );

    if (result.modifiedCount > 0) {
      console.log("✅ Better Auth user role updated to admin");
    } else {
      console.log("✓  Better Auth user already has admin role");
    }

    console.log("\n✅ Admin role confirmed in both collections!\n");
    await mongoose.disconnect();
    process.exit(0);
  }

  // 4. Create Better Auth user via the sign-up API
  console.log("📝 Creating Better Auth user...");
  try {
    const fullName = `${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`;

    const authResponse = await fetch(`${APP_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: APP_URL,
      },
      body: JSON.stringify({
        name: fullName,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        // role is NOT sent here; Better Auth defaults to "student"
        // We set "admin" directly in MongoDB below
      }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      const msg = authData.message || authData.error || "Unknown error";
      if (
        msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("already registered")
      ) {
        console.log(
          "ℹ️  Better Auth user already exists. Creating MongoDB profile...",
        );
      } else {
        console.error("❌ Better Auth signup failed:", msg);
        await mongoose.disconnect();
        process.exit(1);
      }
    } else {
      console.log("✅ Better Auth user created");
    }

    // 5. Update Better Auth user role in database
    // Better Auth stores users in the "user" collection
    // We need to update the role there so session.user.role returns "admin"
    console.log("📝 Updating Better Auth user role to admin...");
    const betterAuthUserCollection = mongoose.connection.collection("user");
    await betterAuthUserCollection.updateOne(
      { email: ADMIN_EMAIL },
      { $set: { role: "admin" } },
    );
    console.log("✅ Better Auth user role updated to admin");

    // 6. Create MongoDB User document with admin role
    console.log("📝 Creating MongoDB User document...");
    const adminUser = await User.create({
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      email: ADMIN_EMAIL,
      role: "admin",
      authUserId: authData.user?.id,
    });

    console.log("✅ MongoDB admin user created");
    console.log("");
    console.log("========================================");
    console.log("   ADMIN CREATED SUCCESSFULLY! 🎉");
    console.log("========================================");
    console.log(`   ID:    ${adminUser._id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role:  ${adminUser.role}`);
    console.log(`   Name:  ${adminUser.firstName} ${adminUser.lastName}`);
    console.log("========================================\n");
  } catch (error: unknown) {
    // Handle duplicate key error (user already in MongoDB)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      console.log("ℹ️  MongoDB user already exists. Promoting to admin...");

      // Update both Better Auth user and MongoDB User collections
      const betterAuthUserCollection = mongoose.connection.collection("user");
      await betterAuthUserCollection.updateOne(
        { email: ADMIN_EMAIL },
        { $set: { role: "admin" } },
      );

      await User.findOneAndUpdate({ email: ADMIN_EMAIL }, { role: "admin" });
      console.log("✅ Existing user promoted to admin!\n");
    } else {
      console.error("❌ Failed to create admin:", error);
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  // 7. Disconnect
  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
  console.log("\n💡 You can now log in at: POST /api/auth/login");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}\n`);
}

// Run
seedAdmin().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
