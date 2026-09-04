import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  appUrl,
  invitationEmail,
  isEmailConfigured,
  sendEmail,
} from "@/lib/email";
import { checkRateLimit, clientIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import {
  resendInvitation,
  resolveAccessToken,
  setInvitationStatus,
} from "@/lib/server/assessmentStore";

/**
 * Cancel or re-send the invitation you sent.
 *
 * Authorised by the inviter's own results token — the same capability that
 * shows them their results — so there is no separate management credential
 * to lose. Only the invitation *sent* by this assessment is reachable, so a
 * token can never act on someone else's invitation.
 */
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action !== "revoke" && action !== "resend") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const access = await resolveAccessToken(body?.token);
  if (!access?.sentInvitation) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 404 });
  }

  const invitation = access.sentInvitation;
  if (invitation.status !== "PENDING") {
    return NextResponse.json(
      { error: "That invitation is no longer open." },
      { status: 409 }
    );
  }

  if (action === "revoke") {
    await setInvitationStatus(invitation.id, "REVOKED");
    return NextResponse.json({ ok: true });
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    RATE_LIMITS.resendInvite,
    clientIdentifier(request)
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "You've re-sent this a few times already. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email isn't configured yet." }, { status: 503 });
  }

  const rawToken = await resendInvitation(invitation.id);
  const result = await sendEmail(
    invitation.inviteeEmail,
    invitationEmail({
      inviterName: access.assessment.participantName,
      inviterEmail: access.assessment.participantEmail,
      url: `${appUrl()}/invite/${rawToken}`,
    })
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: "The invite couldn't be sent. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
