-- Add order_index to plan_instrument table for explicit sorting
ALTER TABLE public.plan_instrument ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;

-- Populate existing rows with order based on their creation time as a fallback
UPDATE public.plan_instrument 
SET order_index = ROW_NUMBER() OVER (PARTITION BY plan_id ORDER BY created_at ASC) - 1
WHERE order_index = 0;
