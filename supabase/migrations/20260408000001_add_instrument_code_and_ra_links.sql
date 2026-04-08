-- Add code to plan_instrument and create junction with plan_ra
-- Date: 2026-04-08

-- 1. Add code to plan_instrument
ALTER TABLE public.plan_instrument
  ADD COLUMN IF NOT EXISTS code TEXT;

-- For existing ones, fill with something unique or keep NULL if allowed, 
-- but user wants it unique. Let's make it NOT NULL after filling if there was data.
-- Since it's a new feature and they're just testing, we'll just add it.
UPDATE public.plan_instrument SET code = id::text WHERE code IS NULL;

ALTER TABLE public.plan_instrument
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT plan_instrument_plan_id_code_key UNIQUE (plan_id, code);

-- 2. Create Instrument ↔ RA junction table
CREATE TABLE IF NOT EXISTS public.plan_instrument_ra (
  instrument_id UUID NOT NULL REFERENCES public.plan_instrument(id) ON DELETE CASCADE,
  plan_ra_id    UUID NOT NULL REFERENCES public.plan_ra(id) ON DELETE CASCADE,
  PRIMARY KEY (instrument_id, plan_ra_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_plan_instrument_ra_inst ON public.plan_instrument_ra(instrument_id);
CREATE INDEX IF NOT EXISTS idx_plan_instrument_ra_ra   ON public.plan_instrument_ra(plan_ra_id);

-- 4. RLS
ALTER TABLE public.plan_instrument_ra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pir_select" ON public.plan_instrument_ra
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_instrument pi WHERE pi.id = plan_instrument_ra.instrument_id
  ));

CREATE POLICY "pir_manage" ON public.plan_instrument_ra
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_instrument pi
    JOIN public.teaching_plans tp ON tp.id = pi.plan_id
    WHERE pi.id = plan_instrument_ra.instrument_id
      AND (public.is_platform_admin()
        OR (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
        OR public.is_org_manager(tp.organization_id))
  ));
