import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { appUrl, isEmailConfigured, resultsEmail, sendEmail } from "@/lib/email";
import { checkRateLimit, clientIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import {
  findLatestAssessmentByEmail,
  issueAccessToken,
} from "@/lib/server/assessmentStore";
import { isPlausibleEmail, normalizeEmail } from "@/lib/tokens";

/**
 * Mails a fresh results link to an address that already has results.
 *
 * Necessary because results links expire after 30 days: without this, the
 * expiry would permanently lock people out of their own data.
 *
 * Always answers `{ ok: true }`, whether or not the address is known. The
 * response must not become an oracle for "has this person used the app",
 * which for a relationship tool is itself sensitive.
 */
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email;

  if (!isPlausibleEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  for (const identifier of [clientIdentifier(request), normalizeEmail(email)]) {
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      RATE_LIMITS.resendAccess,
      identifier
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }
  }

  const assessment = await findLatestAssessmentByEmail(email);
  if (assessment && isEmailConfigured()) {
    const rawToken = await issueAccessToken(assessment.id);
    await sendEmail(
      assessment.participantEmail,
      resultsEmail(assessment.participantName, `${appUrl()}/r/${rawToken}`)
    );
  }

  return NextResponse.json({ ok: true });
}
