import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ComparisonRecord } from "@/lib/bradleyTerry";

/**
 * A completed assessment.
 *
 * Only completed assessments are persisted — an in-progress run lives in the
 * browser (see `src/lib/storage.ts`) so an abandoned assessment never creates
 * a row and answering a question never costs a round trip.
 */
export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantName: text("participant_name").notNull(),
  /** Always stored lowercased — see `normalizeEmail`. */
  participantEmail: text("participant_email").notNull(),
  /**
   * The raw pairwise choices, exactly as the assessment recorded them.
   *
   * Stored as a single JSON document rather than a `comparisons` table
   * because the Bradley-Terry fit always consumes the entire history at
   * once and nothing ever queries an individual comparison.
   */
  history: jsonb("history").$type<ComparisonRecord[]>().notNull(),
  /**
   * Which version of the needs taxonomy these choices were collected under.
   *
   * A stored history references need ids. When the card set changes, old
   * histories must still be interpretable (or at least identifiable as
   * un-interpretable) rather than silently re-scored against cards that
   * didn't exist when the person answered.
   */
  taxonomyVersion: text("taxonomy_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * A capability to read one assessment's results.
 *
 * The raw token is emailed and never stored; only its SHA-256 hash is kept
 * here. One token type covers both a person's own results and the shared
 * comparison — the comparison is reachable from either side's assessment via
 * `invitations`, so it needs no token of its own.
 */
export const accessTokens = pgTable(
  "access_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    /** SHA-256 of the raw token, hex encoded. Never the token itself. */
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("access_tokens_assessment_idx").on(table.assessmentId)]
);

export type InvitationStatus = "PENDING" | "COMPLETED" | "DECLINED" | "REVOKED";

/**
 * One person inviting one partner.
 *
 * `inviteeAssessmentId` is null until the partner finishes; setting it is
 * what links the two assessments into a comparable pair, so no separate
 * join table is needed.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inviterAssessmentId: uuid("inviter_assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    /** Always stored lowercased — see `normalizeEmail`. */
    inviteeEmail: text("invitee_email").notNull(),
    inviteeAssessmentId: uuid("invitee_assessment_id").references(
      () => assessments.id,
      { onDelete: "set null" }
    ),
    /** SHA-256 of the raw invitation token, hex encoded. */
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").$type<InvitationStatus>().notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    sendCount: integer("send_count").notNull().default(0),
  },
  (table) => [
    index("invitations_inviter_idx").on(table.inviterAssessmentId),
    index("invitations_invitee_assessment_idx").on(table.inviteeAssessmentId),
  ]
);

/**
 * Counter buckets backing the rate limiter.
 *
 * Kept in Postgres rather than memory because serverless instances don't
 * share memory — an in-process counter would reset on every cold start and
 * cap nothing.
 */
export const rateLimits = pgTable("rate_limits", {
  /** `${scope}:${identifier}:${windowStart}` */
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type AccessToken = typeof accessTokens.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
