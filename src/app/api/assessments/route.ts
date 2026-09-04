import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  appUrl,
  invitationEmail,
  isEmailConfigured,
  resultsEmail,
  sendEmail,
} from "@/lib/email";
import { checkRateLimit, clientIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import {
  createAssessment,
  createInvitation,
  parseHistory,
  parseName,
} from "@/lib/server/assessmentStore";
import { isPlausibleEmail, normalizeEmail } from "@/lib/tokens";

/**
 * Persists a freshly completed assessment and, optionally, invites a partner.
 *
 * This is the only place a brand-new assessment enters the database — the
 * run itself happens entirely in the browser, so nothing is stored until
 * the person chooses to save it.
 */
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Saving isn't set up yet. Add DATABASE_URL to your environment." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);

  const name = parseName(body?.name);
  const email = body?.email;
  const history = parseHistory(body?.history);
  const rawPartnerEmail = body?.partnerEmail;

  if (!name) {
    return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
  }
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!history) {
    return NextResponse.json(
      { error: "That assessment doesn't look complete. Please retake it." },
      { status: 400 }
    );
  }

  const wantsInvite = rawPartnerEmail !== undefined && rawPartnerEmail !== null && rawPartnerEmail !== "";
  if (wantsInvite && !isPlausibleEmail(rawPartnerEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid email address for your partner." },
      { status: 400 }
    );
  }
  if (wantsInvite && normalizeEmail(rawPartnerEmail) === normalizeEmail(email)) {
    return NextResponse.json(
      { error: "Your partner's email needs to be different from your own." },
      { status: 400 }
    );
  }

  // Two keys: the network address, and the sender's own email — so neither
  // a shared IP nor a rotating one lifts the cap on outbound mail.
  for (const identifier of [clientIdentifier(request), normalizeEmail(email)]) {
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      RATE_LIMITS.createAssessment,
      identifier
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "That's a lot of assessments in a short time. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }
  }

  const { assessment, rawToken } = await createAssessment({ name, email, history });
  const resultsUrl = `${appUrl()}/r/${rawToken}`;

  let inviteSent = false;
  let inviteError: string | null = null;

  if (wantsInvite) {
    const { rawToken: inviteToken } = await createInvitation({
      inviterAssessmentId: assessment.id,
      inviteeEmail: rawPartnerEmail,
    });

    if (isEmailConfigured()) {
      const result = await sendEmail(
        normalizeEmail(rawPartnerEmail),
        invitationEmail({
          inviterName: assessment.participantName,
          inviterEmail: assessment.participantEmail,
          url: `${appUrl()}/invite/${inviteToken}`,
        })
      );
      inviteSent = result.ok;
      if (!result.ok) inviteError = "We saved your results, but the invite email didn't send.";
    } else {
      inviteError = "We saved your results, but email isn't configured yet.";
    }
  }

  // The person already has their results on screen; a failed copy to their
  // inbox is worth reporting but must not fail the save.
  if (isEmailConfigured()) {
    await sendEmail(assessment.participantEmail, resultsEmail(name, resultsUrl));
  }

  return NextResponse.json({ token: rawToken, inviteSent, inviteError });
}
