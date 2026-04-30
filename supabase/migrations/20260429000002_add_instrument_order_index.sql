-- Add order_index to plan_instrument table for explicit sorting
ALTER TABLE public.plan_instrument
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

-- Populate existing rows with order based on their creation time as a fallback
WITH ordered_instruments AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY plan_id ORDER BY created_at ASC, id ASC) - 1 AS next_order_index
  FROM public.plan_instrument
)
UPDATE public.plan_instrument pi
SET order_index = oi.next_order_index
FROM ordered_instruments oi
WHERE pi.id = oi.id;

CREATE INDEX IF NOT EXISTS idx_plan_instrument_plan_order
  ON public.plan_instrument(plan_id, order_index);
