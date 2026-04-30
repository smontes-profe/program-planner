-- Add archived_at column to curriculum_templates for archiving functionality
ALTER TABLE public.curriculum_templates ADD COLUMN archived_at TIMESTAMP NULL;

-- Create index for faster queries on archived status
CREATE INDEX idx_curriculum_templates_archived_at ON public.curriculum_templates(archived_at) WHERE archived_at IS NOT NULL;
