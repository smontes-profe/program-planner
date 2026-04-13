-- Simplify teaching plan status to only draft|published for MVP
-- Remove 'ready' and 'archived' from the CHECK constraint

-- Step 1: Update any existing rows with 'ready' or 'archived' to 'draft'
UPDATE public.teaching_plans
SET status = 'draft'
WHERE status IN ('ready', 'archived');

-- Step 2: Drop the old CHECK constraint
ALTER TABLE public.teaching_plans
DROP CONSTRAINT IF EXISTS teaching_plans_status_check;

-- Step 3: Add the new CHECK constraint with only draft|published
ALTER TABLE public.teaching_plans
ADD CONSTRAINT teaching_plans_status_check
CHECK (status IN ('draft', 'published'));
