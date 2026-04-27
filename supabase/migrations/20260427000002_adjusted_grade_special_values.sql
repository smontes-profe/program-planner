-- Phase 4: special adjusted-grade states for trimester and final columns
-- Date: 2026-04-27

-- Trimester adjusted grades: migrate old NE sentinel (-1) to the new NE sentinel (0)
UPDATE public.evaluation_trimester_adjusted_overrides
SET adjusted_grade = 0
WHERE adjusted_grade = -1;

-- Trimester adjusted grades: allow numeric grades 1..10 plus special sentinels
ALTER TABLE public.evaluation_trimester_adjusted_overrides
  DROP CONSTRAINT IF EXISTS evaluation_trimester_adjusted_overrides_adjusted_grade_check;

ALTER TABLE public.evaluation_trimester_adjusted_overrides
  ADD CONSTRAINT evaluation_trimester_adjusted_overrides_adjusted_grade_check
  CHECK (
    adjusted_grade IN (0, -1, -2, -3, -4, -5, -6, -7, -8)
    OR adjusted_grade BETWEEN 1 AND 10
  );

-- Final improved grades: same catalog of allowed values
ALTER TABLE public.evaluation_final_manual_overrides
  DROP CONSTRAINT IF EXISTS evaluation_final_manual_overrides_improved_final_grade_check;

ALTER TABLE public.evaluation_final_manual_overrides
  ADD CONSTRAINT evaluation_final_manual_overrides_improved_final_grade_check
  CHECK (
    improved_final_grade IN (0, -1, -2, -3, -4, -5, -6, -7, -8)
    OR improved_final_grade BETWEEN 1 AND 10
  );
