-- Records which needs a person chose to rank.
--
-- The assessment now ranks a self-chosen subset rather than the whole card
-- set, so a history is only interpretable alongside the selection it came
-- from. It also keeps "not chosen" distinguishable from "ranked low", which
-- the partner comparison depends on.
--
-- Nullable on purpose: assessments saved before this change ranked every
-- need, and a null here means exactly that rather than missing data.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS selected_needs jsonb;
