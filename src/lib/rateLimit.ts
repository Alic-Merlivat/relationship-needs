import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

export interface RateLimitRule {
  /** Namespace, so two limits never share a counter. */
  scope: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Endpoints that send email take an attacker-controlled recipient address,
 * which makes them an open relay unless they are capped. These are
 * deliberately tight — a real couple needs a handful of sends, not dozens.
 */
export const RATE_LIMITS = {
  /** Completing an assessment (and thereby sending up to two emails). */
  createAssessment: { scope: "create", limit: 5, windowSeconds: 3600 },
  /** Re-sending an invitation to a partner. */
  resendInvite: { scope: "resend-invite", limit: 3, windowSeconds: 3600 },
  /** Requesting a fresh results link to your own address. */
  resendAccess: { scope: "resend-access", limit: 3, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Best-effort client identity for rate limiting.
 *
 * On Vercel `x-forwarded-for` is set by the platform edge and can be
 * trusted; self-hosted behind an untrusted proxy it cannot, which is why
 * every caller also applies a second limit keyed on something semantic
 * (the sender's email) rather than relying on IP alone.
 */
export function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  return ip || "unknown";
}

/**
 * Fixed-window counter.
 *
 * Fixed rather than sliding because the burst it permits at a window
 * boundary (2x the limit) is irrelevant at these magnitudes, and it costs a
 * single upsert instead of a per-request set of timestamps.
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const db = getDb();
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${rule.scope}:${identifier}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart + windowMs - Date.now()) / 1000)
  );

  return { allowed: (row?.count ?? 1) <= rule.limit, retryAfterSeconds };
}

/** Opportunistic cleanup so the counter table doesn't grow without bound. */
export async function purgeExpiredRateLimits(): Promise<void> {
  const db = getDb();
  await db.delete(rateLimits).where(sql`${rateLimits.expiresAt} < now()`);
}
