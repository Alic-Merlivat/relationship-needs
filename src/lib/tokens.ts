import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 bytes = 256 bits of entropy, base64url encoded to 43 characters. */
const TOKEN_BYTES = 32;

export const RESULTS_TOKEN_TTL_DAYS = 30;
export const INVITATION_TTL_DAYS = 30;

/**
 * Mints a new access token.
 *
 * Returns the raw token (emailed to the person, never persisted) alongside
 * the hash that goes in the database.
 */
export function createToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

/**
 * Hashes a token for storage and lookup.
 *
 * SHA-256 rather than bcrypt/argon2 on purpose. Slow password hashes exist
 * to make offline brute force expensive against *low-entropy* human-chosen
 * secrets. A 256-bit random token has no brute-force surface to defend, so
 * the slowdown buys nothing and would cost the indexed O(1) lookup this
 * relies on. This is the standard treatment for session tokens and API keys.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Rejects malformed tokens before they ever reach the database. */
export function isWellFormedToken(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{43}$/.test(raw);
}

/**
 * Constant-time comparison of two hex digests.
 *
 * Token lookup is a single indexed equality query, so this is belt-and-braces
 * rather than load-bearing — but it costs nothing where we compare in code.
 */
export function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Emails are compared for equality, so they're stored casefolded. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Deliberately permissive: the only authority on whether an address is real
 * is whether mail to it is delivered. This rejects obvious typos and
 * anything that would break the `to:` header, nothing more.
 */
export function isPlausibleEmail(email: unknown): email is string {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/.test(email.trim())
  );
}
