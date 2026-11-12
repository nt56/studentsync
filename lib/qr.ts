import jwt from "jsonwebtoken";

/**
 * Check-in QR token signing/verification.
 *
 * The signing secret comes from QR_JWT_SECRET (preferred) or BETTER_AUTH_SECRET.
 * There is intentionally NO hard-coded fallback: a predictable secret would let
 * anyone forge check-in tokens for any registration. In production we throw if
 * neither is set so the misconfiguration surfaces immediately at startup rather
 * than silently shipping a known secret.
 */
function getQrSecret(): string {
  const secret = process.env.QR_JWT_SECRET || process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "QR signing secret missing: set QR_JWT_SECRET (or BETTER_AUTH_SECRET).",
      );
    }
    // Dev-only: warn loudly but allow local work without extra setup.
    console.warn(
      "[QR] No QR_JWT_SECRET/BETTER_AUTH_SECRET set — using an insecure dev secret. " +
        "Do NOT deploy without one of these configured.",
    );
    return "dev_only_insecure_qr_secret";
  }

  return secret;
}

export interface QrPayload {
  registrationId: string;
  eventId: string;
  studentId: string;
}

/**
 * Without `expiresAt` the token lasts 30 days (older tickets). Offline tickets
 * pass the expiry the backend decided (see lib/tickets.ts).
 */
export function signQrToken(payload: QrPayload, expiresAt?: Date): string {
  const claims = { registrationId: payload.registrationId, eventId: payload.eventId, studentId: payload.studentId };
  if (expiresAt) return jwt.sign({ ...claims, exp: Math.floor(expiresAt.getTime() / 1000) }, getQrSecret(), { algorithm: "HS256" });
  return jwt.sign(claims, getQrSecret(), { expiresIn: "30d", algorithm: "HS256" });
}

export function verifyQrToken(token: string, { ignoreExpiration = false }: { ignoreExpiration?: boolean } = {}): QrPayload & { exp?: number } {
  const payload = jwt.verify(token, getQrSecret(), { algorithms: ["HS256"], ignoreExpiration });
  if (typeof payload === "string" || ![payload.registrationId, payload.eventId, payload.studentId].every((id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id))) {
    throw new Error("Invalid QR payload");
  }
  return payload as QrPayload & { exp?: number };
}
