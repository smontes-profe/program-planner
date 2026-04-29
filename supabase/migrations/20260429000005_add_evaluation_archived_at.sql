-- Add archived_at column to evaluations for archiving functionality
ALTER TABLE public.evaluations ADD COLUMN archived_at TIMESTAMP NULL;

-- Create index for faster queries on archived status
CREATE INDEX idx_evaluations_archived_at ON public.evaluations(archived_at) WHERE archived_at IS NOT NULL;
