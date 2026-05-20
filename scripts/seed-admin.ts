/**
 * ============================================================
 * ADMIN SEED SCRIPT
 * ============================================================
 *
 * Creates (or repairs) the super-admin user.
 * Works WITHOUT a running dev server — calls Better Auth's
 * programmatic API directly instead of making an HTTP request.
 *
 * HOW IT WORKS:
 * 1. Ensures the Better Auth user + credential account exist
 * 2. Sets role = "admin" in the Better Auth "user" collection
 * 3. Ensures the corresponding MongoDB User document exists
 *    with role = "admin"
 *
 * USAGE:
 *   npx tsx scripts/seed-admin.ts
 *
 * ENVIRONMENT VARIABLES (set in .env):
 *   ADMIN_EMAIL      - Admin email (default: admin@example.com)
 *   ADMIN_PASSWORD   - Admin password (default: Admin@1234)
 *   ADMIN_FIRST_NAME - Admin first name (default: Super)
 *   ADMIN_LAST_NAME  - Admin last name (default: Admin)
 *   MONGODB_URI      - MongoDB connection string (required)
 * ============================================================
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load .env BEFORE any other imports that read process.env
dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || "Super";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || "Admin";
const MONGODB_URI = process.env.MONGODB_URI;

// ===========================
// User Schema (inline — matches models/User.ts, avoids import issues)
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
    profileImage: { type: String, default: null },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
    authUserId: { type: String, sparse: true, unique: true },
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

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env file");
    process.exit(1);
  }

  console.log(`📧 Admin Email:    ${ADMIN_EMAIL}`);
  console.log(`👤 Admin Name:     ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`);
  console.log("");

  // Connect to MongoDB
  console.log("🔌 Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  // Dynamic import AFTER dotenv.config() so MONGODB_URI is available inside lib/auth.ts
  // Better Auth creates its own MongoClient; it coexists fine with mongoose.
  const { auth } = await import("../lib/auth");

  // ─── Step 1: Ensure the Better Auth user + credential account exist ───────
  const betterAuthUserCollection = mongoose.connection.collection("user");
  const betterAuthAccountCollection = mongoose.connection.collection("account");

  let betterAuthUserId: string | undefined;

  const existingBaUser = await betterAuthUserCollection.findOne({
    email: ADMIN_EMAIL,
  });

  const existingCredentialAccount = await betterAuthAccountCollection.findOne({
    accountId: ADMIN_EMAIL,
    providerId: "credential",
  });

  if (!existingBaUser || !existingCredentialAccount) {
    console.log(
      "📝 Better Auth user/account missing — creating via auth.api.signUpEmail...",
    );

    try {
      const signUpResult = await auth.api.signUpEmail({
        body: {
          name: `${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        },
      });

      betterAuthUserId = signUpResult.user?.id;
      console.log("✅ Better Auth user + credential account created");
    } catch (signUpError: unknown) {
      const msg =
        (signUpError instanceof Error ? signUpError.message : "") || "";

      if (
        msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("already registered")
      ) {
        console.log("ℹ️  Better Auth user already exists (race). Continuing...");
        const baUser = await betterAuthUserCollection.findOne({
          email: ADMIN_EMAIL,
        });
        betterAuthUserId = (baUser?.id as string) || baUser?._id?.toString();
      } else {
        console.error("❌ Failed to create Better Auth user:", signUpError);
        await mongoose.disconnect();
        process.exit(1);
      }
    }
  } else {
    betterAuthUserId =
      (existingBaUser.id as string) || existingBaUser._id?.toString();
    console.log("✓  Better Auth user + credential account already exist");
  }

  // ─── Step 2: Set role = "admin" in the Better Auth user collection ─────────
  await betterAuthUserCollection.updateOne(
    { email: ADMIN_EMAIL },
    { $set: { role: "admin" } },
  );
  console.log("✅ Better Auth user role = admin");

  // ─── Step 3: Ensure MongoDB User document exists with role = "admin" ───────
  const existingMongoUser = await User.findOne({ email: ADMIN_EMAIL });

  if (!existingMongoUser) {
    const adminUser = await User.create({
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      email: ADMIN_EMAIL,
      role: "admin",
      authUserId: betterAuthUserId,
    });

    console.log("✅ MongoDB User document created");
    console.log("");
    console.log("========================================");
    console.log("   ADMIN CREATED SUCCESSFULLY! 🎉");
    console.log("========================================");
    console.log(`   ID:    ${adminUser._id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role:  ${adminUser.role}`);
    console.log(`   Name:  ${adminUser.firstName} ${adminUser.lastName}`);
    console.log("========================================");
  } else {
    // Repair existing document: ensure role is admin and authUserId is linked
    const updates: Record<string, unknown> = { role: "admin" };
    if (!existingMongoUser.authUserId && betterAuthUserId) {
      updates.authUserId = betterAuthUserId;
    }

    await User.findOneAndUpdate({ email: ADMIN_EMAIL }, { $set: updates });
    console.log("✅ MongoDB User document updated (role = admin)");
    console.log("");
    console.log("========================================");
    console.log("   ADMIN REPAIRED SUCCESSFULLY! 🎉");
    console.log("========================================");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Role:  admin`);
    console.log("========================================");
  }

  console.log("");
  console.log("💡 Login credentials:");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log("");

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
}

seedAdmin().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
