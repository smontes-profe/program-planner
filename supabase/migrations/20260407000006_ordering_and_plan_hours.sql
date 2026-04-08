-- Add order_index to RA and CE tables for explicit sorting
ALTER TABLE public.template_ra ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.template_ce ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.plan_ra ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.plan_ce ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;

-- Optionally, we can populate existing rows so their order_index roughly matches their code.
-- For now they are all 0, which means they will fall back to secondary sorting logic (like Code).

-- Add hours_total to teaching_plans so it can be overridden per plan
ALTER TABLE public.teaching_plans ADD COLUMN hours_total INTEGER NOT NULL DEFAULT 0;

-- We should also copy over the hours_total from the curriculum template when creating a plan.
-- This requires updating the insert logic in the server action, but for existing plans:
UPDATE public.teaching_plans tp
SET hours_total = COALESCE(ct.hours_total, 0)
FROM public.curriculum_templates ct
WHERE tp.source_template_id = ct.id AND tp.hours_total = 0;
