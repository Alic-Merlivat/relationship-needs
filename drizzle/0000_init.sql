-- My Relationship Needs — initial server persistence schema.
--
-- Run this once against your Postgres database (e.g. paste it into the Neon
-- SQL editor). It is idempotent, so re-running it is harmless.
--
-- Emails are stored lowercased by the application rather than using citext,
-- so no extension is required.

CREATE TABLE IF NOT EXISTS assessments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_name  text NOT NULL,
  participant_email text NOT NULL,
  history           jsonb NOT NULL,
  taxonomy_version  text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS access_tokens_assessment_idx
  ON access_tokens (assessment_id);

CREATE TABLE IF NOT EXISTS invitations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  invitee_email         text NOT NULL,
  invitee_assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  token_hash            text NOT NULL UNIQUE,
  status                text NOT NULL DEFAULT 'PENDING',
  created_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL,
  completed_at          timestamptz,
  last_sent_at          timestamptz,
  send_count            integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invitations_inviter_idx
  ON invitations (inviter_assessment_id);

CREATE INDEX IF NOT EXISTS invitations_invitee_assessment_idx
  ON invitations (invitee_assessment_id);

-- Rate-limit counters. Kept in Postgres because serverless instances do not
-- share memory, so an in-process counter would reset on every cold start.
CREATE TABLE IF NOT EXISTS rate_limits (
  key        text PRIMARY KEY,
  count      integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expires_at);
