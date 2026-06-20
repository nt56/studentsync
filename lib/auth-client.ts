import { createAuthClient } from "better-auth/react";

// No explicit baseURL — Better Auth client auto-detects window.location.origin at runtime.
// This ensures OAuth sign-in works in any environment (dev, staging, production) without
// needing NEXT_PUBLIC_APP_URL to be configured in Vercel.
export const authClient = createAuthClient({});

// Export individual methods for convenience
export const { signIn, signUp, signOut, useSession } = authClient;

// ===========================
// CUSTOM AUTH HELPER TYPES
// ===========================

export interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: "male" | "female" | "other" | "prefer-not-to-say";
  dateOfBirth: string;
  phone?: string;
  collegeId?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// ===========================
// EMAIL/PASSWORD AUTH FUNCTIONS
// ===========================

/**
 * Sign up with email and password.
 * This calls our custom /api/auth/register endpoint (NOT Better Auth directly)
 * so that extra fields (firstName, lastName, gender, dob, phone) are saved.
 *
 * @example
 * ```typescript
 * const result = await signUpWithEmail({
 *   firstName: "John",
 *   lastName: "Doe",
 *   email: "john@example.com",
 *   password: "SecurePass1",
 *   confirmPassword: "SecurePass1",
 *   gender: "male",
 *   dateOfBirth: "2000-01-15T00:00:00.000Z",
 * });
 * ```
 */
export async function signUpWithEmail(data: SignUpData) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Sign in with email and password
 * @param data - User login credentials
 * @returns Promise with the signin result
 *
 * @example
 * ```typescript
 * const result = await signInWithEmail({
 *   email: "john@example.com",
 *   password: "SecurePass1"
 * });
 * ```
 */
export async function signInWithEmail(data: SignInData) {
  return signIn.email({
    email: data.email,
    password: data.password,
  });
}

// ===========================
// OAUTH AUTH FUNCTIONS
// ===========================

export async function signInWithGoogle(callbackURL?: string) {
  return signIn.social({ provider: "google", callbackURL: callbackURL || "/" });
}

export async function signInWithGithub(callbackURL?: string) {
  return signIn.social({ provider: "github", callbackURL: callbackURL || "/" });
}

// ===========================
// PASSWORD RESET & EMAIL VERIFICATION
// ===========================

/**
 * Request a password-reset email. Better Auth emails a link to
 * `${origin}/reset-password?token=...` which the reset page consumes.
 */
export async function requestPasswordReset(email: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: "/reset-password",
  });
}

/** Complete a password reset using the token from the emailed link. */
export async function resetPassword(newPassword: string, token: string) {
  return authClient.resetPassword({ newPassword, token });
}

/** Re-send the verification email to a user who hasn't verified yet. */
export async function resendVerificationEmail(email: string) {
  return authClient.sendVerificationEmail({
    email,
    callbackURL: "/dashboard",
  });
}

// ===========================
// SESSION HELPERS
// ===========================

/**
 * Get current user session on client-side
 * Use this in Client Components with useSession hook
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { data: session, isPending, error } = useSession();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (!session) return <div>Not logged in</div>;
 *
 *   return <div>Hello, {session.user.name}!</div>;
 * }
 * ```
 */
// export { useSession };

/**
 * Sign out the current user
 * @returns Promise with the signout result
 *
 * @example
 * ```typescript
 * await handleSignOut();
 * ```
 */
export async function handleSignOut() {
  return signOut();
}
