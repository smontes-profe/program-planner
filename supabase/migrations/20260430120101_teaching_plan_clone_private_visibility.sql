-- Track teaching plan clones and enforce their private visibility.

ALTER TABLE public.teaching_plans
  ADD COLUMN IF NOT EXISTS is_clone BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.teaching_plans
SET is_clone = TRUE,
    visibility_scope = 'private'
WHERE source_plan_id IS NOT NULL;

UPDATE public.teaching_plans
SET is_clone = FALSE
WHERE source_plan_id IS NULL
  AND is_clone IS NULL;

ALTER TABLE public.teaching_plans
  DROP CONSTRAINT IF EXISTS teaching_plans_clone_private_check;

ALTER TABLE public.teaching_plans
  ADD CONSTRAINT teaching_plans_clone_private_check
  CHECK (
    (is_clone = FALSE)
    OR (visibility_scope = 'private' AND source_plan_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_teaching_plans_source_plan_id
  ON public.teaching_plans(source_plan_id)
  WHERE source_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teaching_plans_is_clone
  ON public.teaching_plans(is_clone)
  WHERE is_clone = TRUE;
