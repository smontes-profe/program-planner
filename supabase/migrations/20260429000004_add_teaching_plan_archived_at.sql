-- Add archived_at column to teaching_plans for archiving functionality
ALTER TABLE public.teaching_plans ADD COLUMN archived_at TIMESTAMP NULL;

-- Create index for faster queries on archived status
CREATE INDEX idx_teaching_plans_archived_at ON public.teaching_plans(archived_at) WHERE archived_at IS NOT NULL;
