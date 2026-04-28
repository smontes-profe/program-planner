-- Remove legacy curriculum template select policy that still exposed organization drafts.

DROP POLICY IF EXISTS "templates_select_policy" ON public.curriculum_templates;
