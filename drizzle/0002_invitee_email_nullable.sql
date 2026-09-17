-- Supports WhatsApp-shared invitations, which have no address at creation —
-- the invitee is chosen inside WhatsApp's own contact picker, not typed by
-- anyone into a form. Their email is only known once they complete their
-- own assessment, so the column can no longer be required up front.

ALTER TABLE invitations ALTER COLUMN invitee_email DROP NOT NULL;
