-- Track curriculum clones and enforce their private visibility.

ALTER TABLE public.curriculum_templates
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES public.curriculum_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_clone BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.curriculum_templates
SET is_clone = FALSE
WHERE is_clone IS NULL;

ALTER TABLE public.curriculum_templates
  DROP CONSTRAINT IF EXISTS curriculum_templates_clone_private_check;

ALTER TABLE public.curriculum_templates
  ADD CONSTRAINT curriculum_templates_clone_private_check
  CHECK (
    (is_clone = FALSE)
    OR (visibility_scope = 'private' AND source_template_id IS NOT NULL)
  );

ALTER TABLE public.curriculum_templates
  DROP CONSTRAINT IF EXISTS curriculum_templates_source_template_not_self_check;

ALTER TABLE public.curriculum_templates
  ADD CONSTRAINT curriculum_templates_source_template_not_self_check
  CHECK (source_template_id IS NULL OR source_template_id <> id);

CREATE INDEX IF NOT EXISTS idx_curriculum_templates_source_template_id
  ON public.curriculum_templates(source_template_id)
  WHERE source_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_curriculum_templates_is_clone
  ON public.curriculum_templates(is_clone)
  WHERE is_clone = TRUE;
