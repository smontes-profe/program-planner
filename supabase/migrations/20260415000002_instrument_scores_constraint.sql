-- Date: 2026-04-15
-- Ensure we can reuse the unique index via a named constraint for ON CONFLICT
ALTER TABLE public.instrument_student_scores
  ADD COLUMN plan_ce_key UUID GENERATED ALWAYS AS (
    COALESCE(plan_ce_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) STORED NOT NULL;

DROP INDEX IF EXISTS idx_scores_unique;

ALTER TABLE public.instrument_student_scores
  ADD CONSTRAINT instrument_student_scores_unique UNIQUE (
    context_id, instrument_id, student_id, plan_ce_key
  );
