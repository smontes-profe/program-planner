-- Migration to allow multiple trimesters in a teaching unit
-- Date: 2026-04-07

-- Remove single trimester constraint
ALTER TABLE public.plan_teaching_unit DROP COLUMN IF EXISTS trimester;

-- Add boolean flags for each trimester
ALTER TABLE public.plan_teaching_unit 
  ADD COLUMN active_t1 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN active_t2 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN active_t3 BOOLEAN NOT NULL DEFAULT false;

-- Ensure existing rows pass the constraint
UPDATE public.plan_teaching_unit SET active_t1 = true;

-- To ensure at least one trimester is checked, we can optionally add a constraint:
ALTER TABLE public.plan_teaching_unit
  ADD CONSTRAINT at_least_one_trimester_chk 
  CHECK (active_t1 = true OR active_t2 = true OR active_t3 = true);
