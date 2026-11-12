import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

/**
 * Google ID-token verification for native sign-in.
 *
 * Better Auth's built-in check accepts only GOOGLE_CLIENT_ID as the audience.
 * The native SDKs can mint tokens for the iOS or Android client ID instead, so
 * this verifier accepts the web client ID plus GOOGLE_NATIVE_CLIENT_IDS
 * (comma-separated). Signature (RS256 against Google's published keys), issuer,
 * audience, expiry, token age, and the optional nonce are all checked.
 */

const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const MAX_AGE_SECONDS = 3600;
const CLOCK_SKEW_SECONDS = 60;

export type GoogleJwk = JsonWebKey & { kid: string; alg?: string };

export function googleAudiences(): string[] {
  return [process.env.GOOGLE_CLIENT_ID, ...(process.env.GOOGLE_NATIVE_CLIENT_IDS ?? "").split(",")]
    .map((value) => value?.trim()).filter((value): value is string => !!value);
}

let cachedKeys: { keys: GoogleJwk[]; expiresAt: number } | null = null;

async function googleKeys(forceRefresh = false): Promise<GoogleJwk[]> {
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch(CERTS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Google keys returned HTTP ${response.status}`);
  const { keys } = await response.json() as { keys?: GoogleJwk[] };
  if (!Array.isArray(keys)) throw new Error("Google keys response had no keys");
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  cachedKeys = { keys, expiresAt: Date.now() + Math.min(maxAge, 86_400) * 1000 };
  return keys;
}

const decodeSegment = (segment: string) => JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));

/** Pure check against a given key set. Returns false for anything invalid. */
export function verifyIdTokenWithKeys(
  token: string,
  keys: GoogleJwk[],
  { audiences, nonce, now = Date.now() }: { audiences: string[]; nonce?: string; now?: number },
): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !audiences.length) return false;
    const header = decodeSegment(parts[0]) as { alg?: string; kid?: string };
    if (header.alg !== "RS256" || !header.kid) return false;
    const jwk = keys.find((key) => key.kid === header.kid);
    if (!jwk) return false;
    const valid = createVerify("RSA-SHA256").update(`${parts[0]}.${parts[1]}`)
      .verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"));
    if (!valid) return false;
    const claims = decodeSegment(parts[1]) as { iss?: string; aud?: string | string[]; exp?: number; iat?: number; nonce?: string; email?: string };
    const seconds = Math.floor(now / 1000);
    const tokenAudiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!claims.iss || !ISSUERS.has(claims.iss)) return false;
    if (!tokenAudiences.some((audience) => !!audience && audiences.includes(audience))) return false;
    if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_SECONDS <= seconds) return false;
    if (typeof claims.iat !== "number" || claims.iat - CLOCK_SKEW_SECONDS > seconds || seconds - claims.iat > MAX_AGE_SECONDS) return false;
    if (nonce && claims.nonce !== nonce) return false;
    if (!claims.email) return false;
    return true;
  } catch {
    return false;
  }
}

/** Used by Better Auth's Google provider for every idToken sign-in (web and native). */
export async function verifyGoogleIdToken(token: string, nonce?: string): Promise<boolean> {
  const audiences = googleAudiences();
  if (!audiences.length) return false;
  let keys = await googleKeys();
  let kid: string | undefined;
  try { kid = decodeSegment(token.split(".")[0]).kid; } catch { return false; }
  // Google rotates keys; refresh once when the token names a key we do not have.
  if (kid && !keys.some((key) => key.kid === kid)) keys = await googleKeys(true);
  return verifyIdTokenWithKeys(token, keys, { audiences, nonce });
}
