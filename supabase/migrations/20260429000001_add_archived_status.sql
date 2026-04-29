-- Migration: Add 'archived' status to curriculum_templates and evaluation_contexts
-- Date: 2026-04-29

-- 1. Curriculum Templates
-- The previous constraint was likely named curriculum_templates_status_check (automatic name)
-- We'll try to drop it if we can find it, or just add a new one after dropping.
-- Actually, it's safer to drop it by name if we can be sure, but we can also use a script to find it.

DO $$
BEGIN
    -- Drop existing check constraint for curriculum_templates status if it exists
    -- Postgres usually names it <table_name>_<column_name>_check
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curriculum_templates_status_check') THEN
        ALTER TABLE public.curriculum_templates DROP CONSTRAINT curriculum_templates_status_check;
    END IF;
END $$;

ALTER TABLE public.curriculum_templates 
    ADD CONSTRAINT curriculum_templates_status_check 
    CHECK (status IN ('draft', 'published', 'deprecated', 'archived'));

-- 2. Evaluation Contexts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_contexts_status_check') THEN
        ALTER TABLE public.evaluation_contexts DROP CONSTRAINT evaluation_contexts_status_check;
    END IF;
END $$;

ALTER TABLE public.evaluation_contexts 
    ADD CONSTRAINT evaluation_contexts_status_check 
    CHECK (status IN ('draft', 'active', 'closed', 'archived'));

-- 3. Teaching Plans (already has archived, but let's ensure it's there correctly)
-- In 20260406085621_teaching_plans_schema.sql it was:
-- status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'published', 'archived')) DEFAULT 'draft'
-- No changes needed if it's already there.
