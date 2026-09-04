import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { checkRateLimit, clientIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import {
  resolveInvitationToken,
  setInvitationStatus,
} from "@/lib/server/assessmentStore";

/**
 * The invited partner opting out.
 *
 * Declining tells the inviter nothing beyond the invitation no longer being
 * open — there's no notification, because someone who chose not to take
 * part shouldn't have that choice announced.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { allowed } = await checkRateLimit(
    RATE_LIMITS.createAssessment,
    clientIdentifier(request)
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const { token } = await ctx.params;
  const resolved = await resolveInvitationToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: true });
  }

  await setInvitationStatus(resolved.invitation.id, "DECLINED");
  return NextResponse.json({ ok: true });
}
