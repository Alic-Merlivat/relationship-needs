import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  appUrl,
  isEmailConfigured,
  partnerCompletedEmail,
  partnerResultsEmail,
  sendEmail,
} from "@/lib/email";
import { checkRateLimit, clientIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import {
  attachInviteeAssessment,
  createAssessment,
  issueAccessToken,
  parseHistory,
  parseName,
  resolveInvitationToken,
} from "@/lib/server/assessmentStore";

/**
 * The invited partner finishing their assessment.
 *
 * Their email is never taken from the request body — it comes from the
 * invitation, so results always reach the address that was actually
 * invited even if the link was forwarded to someone else.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Saving isn't set up yet. Add DATABASE_URL to your environment." },
      { status: 503 }
    );
  }

  const { token } = await ctx.params;
  const body = await request.json().catch(() => null);

  const name = parseName(body?.name);
  const history = parseHistory(body?.history);

  if (!name) {
    return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
  }
  if (!history) {
    return NextResponse.json(
      { error: "That assessment doesn't look complete. Please retake it." },
      { status: 400 }
    );
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    RATE_LIMITS.createAssessment,
    clientIdentifier(request)
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const resolved = await resolveInvitationToken(token);
  if (!resolved) {
    return NextResponse.json(
      { error: "This invitation is no longer valid. Ask your partner to send a new one." },
      { status: 404 }
    );
  }

  const { invitation, inviter } = resolved;

  const { assessment: invitee, rawToken } = await createAssessment({
    name,
    email: invitation.inviteeEmail,
    history,
  });

  const attached = await attachInviteeAssessment({
    invitationId: invitation.id,
    inviteeAssessmentId: invitee.id,
  });

  if (!attached) {
    // Another submission won the race. The assessment just created is still
    // this person's own, so hand back its token rather than losing their work.
    return NextResponse.json({ token: rawToken, alreadyCompleted: true });
  }

  if (isEmailConfigured()) {
    const inviterToken = await issueAccessToken(inviter.id);
    await Promise.all([
      sendEmail(
        invitee.participantEmail,
        partnerResultsEmail({
          name: invitee.participantName,
          partnerName: inviter.participantName,
          url: `${appUrl()}/r/${rawToken}`,
        })
      ),
      sendEmail(
        inviter.participantEmail,
        partnerCompletedEmail({
          name: inviter.participantName,
          partnerName: invitee.participantName,
          url: `${appUrl()}/r/${inviterToken}/compare`,
        })
      ),
    ]);
  }

  return NextResponse.json({ token: rawToken });
}
