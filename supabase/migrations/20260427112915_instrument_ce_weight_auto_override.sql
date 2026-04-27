-- Allow automation to be turned off per instrument for CE weights
ALTER TABLE public.plan_instrument
  ADD COLUMN IF NOT EXISTS ce_weight_auto BOOLEAN NOT NULL DEFAULT true;
