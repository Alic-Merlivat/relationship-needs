import { and, desc, eq } from "drizzle-orm";
import { NEEDS, TAXONOMY_VERSION } from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { MIN_COMPARISONS, EXTENDED_MAX_COMPARISONS } from "@/lib/confidence";
import { getDb } from "@/lib/db/client";
import {
  accessTokens,
  assessments,
  invitations,
  type Assessment,
  type Invitation,
} from "@/lib/db/schema";
import {
  createToken,
  daysFromNow,
  hashToken,
  INVITATION_TTL_DAYS,
  isWellFormedToken,
  normalizeEmail,
  RESULTS_TOKEN_TTL_DAYS,
} from "@/lib/tokens";

const KNOWN_NEED_IDS = new Set(NEEDS.map((n) => n.id));

export const MAX_NAME_LENGTH = 60;

/**
 * Validates a history submitted by a client.
 *
 * The browser is the only thing that produces these, but it is also the
 * only thing an attacker controls, so nothing here is taken on trust: every
 * id must resolve to a real card, a need can't beat itself, and the length
 * must be inside the range the assessment can actually produce.
 */
export function parseHistory(value: unknown): ComparisonRecord[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length < MIN_COMPARISONS || value.length > EXTENDED_MAX_COMPARISONS) {
    return null;
  }
  const history: ComparisonRecord[] = [];
  for (const entry of value) {
    const winnerId = (entry as ComparisonRecord)?.winnerId;
    const loserId = (entry as ComparisonRecord)?.loserId;
    if (typeof winnerId !== "string" || typeof loserId !== "string") return null;
    if (winnerId === loserId) return null;
    if (!KNOWN_NEED_IDS.has(winnerId) || !KNOWN_NEED_IDS.has(loserId)) return null;
    history.push({ winnerId, loserId });
  }
  return history;
}

export function parseName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

/** Persists a completed assessment and mints its owner's private results token. */
export async function createAssessment(input: {
  name: string;
  email: string;
  history: ComparisonRecord[];
}): Promise<{ assessment: Assessment; rawToken: string }> {
  const db = getDb();
  const [assessment] = await db
    .insert(assessments)
    .values({
      participantName: input.name,
      participantEmail: normalizeEmail(input.email),
      history: input.history,
      taxonomyVersion: TAXONOMY_VERSION,
    })
    .returning();

  const rawToken = await issueAccessToken(assessment.id);
  return { assessment, rawToken };
}

/**
 * Mints a fresh results token for an assessment.
 *
 * Existing tokens are left alone — someone asking for a new link has
 * usually just lost the old email, not had it stolen, and silently breaking
 * a link they might still find is worse than having two live. Use
 * `revokeAccessTokens` for the theft case.
 */
export async function issueAccessToken(assessmentId: string): Promise<string> {
  const db = getDb();
  const { raw, hash } = createToken();
  await db.insert(accessTokens).values({
    assessmentId,
    tokenHash: hash,
    expiresAt: daysFromNow(RESULTS_TOKEN_TTL_DAYS),
  });
  return raw;
}

export async function revokeAccessTokens(assessmentId: string): Promise<void> {
  const db = getDb();
  await db
    .update(accessTokens)
    .set({ revokedAt: new Date() })
    .where(eq(accessTokens.assessmentId, assessmentId));
}

export interface ResolvedAccess {
  assessment: Assessment;
  /** The invitation this person sent, if they were the inviter. */
  sentInvitation: Invitation | null;
  /** The invitation this person accepted, if they were the invitee. */
  receivedInvitation: Invitation | null;
  /** The partner's assessment, present only once both sides are complete. */
  partner: Assessment | null;
}

/**
 * Exchanges a raw results token for the assessment it unlocks, plus enough
 * of the partner relationship to render the comparison.
 *
 * Returns null for anything not currently valid — unknown, malformed,
 * expired or revoked — so callers cannot accidentally distinguish those
 * cases and leak whether a token ever existed.
 */
export async function resolveAccessToken(
  raw: unknown
): Promise<ResolvedAccess | null> {
  if (!isWellFormedToken(raw)) return null;
  const db = getDb();

  const [token] = await db
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.tokenHash, hashToken(raw)))
    .limit(1);

  if (!token) return null;
  if (token.revokedAt) return null;
  if (token.expiresAt.getTime() <= Date.now()) return null;

  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, token.assessmentId))
    .limit(1);

  if (!assessment) return null;

  // Fire-and-forget: a failed bookkeeping write shouldn't deny access.
  void db
    .update(accessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(accessTokens.id, token.id))
    .catch(() => {});

  const [sentInvitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.inviterAssessmentId, assessment.id))
    .limit(1);

  const [receivedInvitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.inviteeAssessmentId, assessment.id))
    .limit(1);

  const partnerId =
    sentInvitation?.inviteeAssessmentId ?? receivedInvitation?.inviterAssessmentId;

  let partner: Assessment | null = null;
  if (partnerId) {
    const [row] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, partnerId))
      .limit(1);
    partner = row ?? null;
  }

  return {
    assessment,
    sentInvitation: sentInvitation ?? null,
    receivedInvitation: receivedInvitation ?? null,
    partner,
  };
}

export async function createInvitation(input: {
  inviterAssessmentId: string;
  inviteeEmail: string;
}): Promise<{ invitation: Invitation; rawToken: string }> {
  const db = getDb();
  const { raw, hash } = createToken();
  const [invitation] = await db
    .insert(invitations)
    .values({
      inviterAssessmentId: input.inviterAssessmentId,
      inviteeEmail: normalizeEmail(input.inviteeEmail),
      tokenHash: hash,
      expiresAt: daysFromNow(INVITATION_TTL_DAYS),
      lastSentAt: new Date(),
      sendCount: 1,
    })
    .returning();
  return { invitation, rawToken: raw };
}

export interface ResolvedInvitation {
  invitation: Invitation;
  inviter: Assessment;
}

/** Resolves a raw invitation token, but only while it is still actionable. */
export async function resolveInvitationToken(
  raw: unknown
): Promise<ResolvedInvitation | null> {
  if (!isWellFormedToken(raw)) return null;
  const db = getDb();

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, hashToken(raw)))
    .limit(1);

  if (!invitation) return null;
  if (invitation.status === "REVOKED" || invitation.status === "DECLINED") {
    return null;
  }
  if (invitation.expiresAt.getTime() <= Date.now()) return null;

  const [inviter] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, invitation.inviterAssessmentId))
    .limit(1);

  if (!inviter) return null;
  return { invitation, inviter };
}

/**
 * Records the invitee's completed assessment against the invitation.
 *
 * Conditioned on the invitation still being PENDING so two submissions
 * racing (a double-tapped button, a retried request) cannot both attach —
 * the second gets no row back and the caller treats it as already done.
 */
export async function attachInviteeAssessment(input: {
  invitationId: string;
  inviteeAssessmentId: string;
}): Promise<Invitation | null> {
  const db = getDb();
  const [updated] = await db
    .update(invitations)
    .set({
      inviteeAssessmentId: input.inviteeAssessmentId,
      status: "COMPLETED",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(invitations.id, input.invitationId),
        eq(invitations.status, "PENDING")
      )
    )
    .returning();
  return updated ?? null;
}

export async function setInvitationStatus(
  invitationId: string,
  status: "REVOKED" | "DECLINED"
): Promise<void> {
  const db = getDb();
  await db
    .update(invitations)
    .set({ status })
    .where(eq(invitations.id, invitationId));
}

/**
 * Re-sends an invitation, issuing a new token for it.
 *
 * The token necessarily changes: only its hash is stored, so the original
 * cannot be recovered to put in a second email. That means an earlier
 * invitation link stops working once a new one is sent — the invite page
 * handles this by telling the partner to ask for a fresh link rather than
 * failing silently.
 *
 * Resending also renews the 30-day window, so an invitation that arrived
 * late or sat unread doesn't strand the partner with a dead link.
 */
export async function resendInvitation(invitationId: string): Promise<string> {
  const db = getDb();
  const { raw, hash } = createToken();
  const [current] = await db
    .select({ sendCount: invitations.sendCount })
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  await db
    .update(invitations)
    .set({
      tokenHash: hash,
      lastSentAt: new Date(),
      sendCount: (current?.sendCount ?? 0) + 1,
      expiresAt: daysFromNow(INVITATION_TTL_DAYS),
    })
    .where(eq(invitations.id, invitationId));

  return raw;
}

/** Finds the most recent assessment for an email, for re-issuing a lost link. */
export async function findLatestAssessmentByEmail(
  email: string
): Promise<Assessment | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.participantEmail, normalizeEmail(email)))
    .orderBy(desc(assessments.completedAt))
    .limit(1);
  return row ?? null;
}
