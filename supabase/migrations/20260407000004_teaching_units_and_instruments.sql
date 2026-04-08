-- Phase 3B: Teaching Units (UTs) + Evaluation Instruments
-- Date: 2026-04-07

-- ─── 1. Add hours_total to curriculum_templates ────────────────────────────
ALTER TABLE public.curriculum_templates
  ADD COLUMN IF NOT EXISTS hours_total INTEGER DEFAULT 0
    CHECK (hours_total >= 0);

-- ─── 2. Plan Teaching Units (UTs) ─────────────────────────────────────────
CREATE TABLE public.plan_teaching_unit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID NOT NULL REFERENCES public.teaching_plans(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  title        TEXT NOT NULL,
  trimester    TEXT NOT NULL CHECK (trimester IN ('T1', 'T2', 'T3')),
  hours        INTEGER NOT NULL DEFAULT 0 CHECK (hours >= 0),
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, code)
);

-- ─── 3. UT ↔ RA coverage (which RAs a UT covers) ──────────────────────────
CREATE TABLE public.plan_unit_ra (
  unit_id    UUID NOT NULL REFERENCES public.plan_teaching_unit(id) ON DELETE CASCADE,
  plan_ra_id UUID NOT NULL REFERENCES public.plan_ra(id) ON DELETE CASCADE,
  PRIMARY KEY (unit_id, plan_ra_id)
);

-- ─── 4. Evaluation Instruments (belong to the plan) ───────────────────────
CREATE TABLE public.plan_instrument (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES public.teaching_plans(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('exam', 'practice', 'project', 'oral', 'other')),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. Instrument ↔ UT (which UTs an instrument serves) ──────────────────
CREATE TABLE public.plan_instrument_unit (
  instrument_id UUID NOT NULL REFERENCES public.plan_instrument(id) ON DELETE CASCADE,
  unit_id       UUID NOT NULL REFERENCES public.plan_teaching_unit(id) ON DELETE CASCADE,
  PRIMARY KEY (instrument_id, unit_id)
);

-- ─── 6. Instrument ↔ CE + weight (what CEs an instrument evaluates) ────────
CREATE TABLE public.plan_instrument_ce (
  instrument_id UUID NOT NULL REFERENCES public.plan_instrument(id) ON DELETE CASCADE,
  plan_ce_id    UUID NOT NULL REFERENCES public.plan_ce(id) ON DELETE CASCADE,
  weight        NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (weight >= 0 AND weight <= 100),
  PRIMARY KEY (instrument_id, plan_ce_id)
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_plan_teaching_unit_plan  ON public.plan_teaching_unit(plan_id);
CREATE INDEX idx_plan_unit_ra_unit        ON public.plan_unit_ra(unit_id);
CREATE INDEX idx_plan_unit_ra_ra          ON public.plan_unit_ra(plan_ra_id);
CREATE INDEX idx_plan_instrument_plan     ON public.plan_instrument(plan_id);
CREATE INDEX idx_plan_instrument_unit     ON public.plan_instrument_unit(instrument_id);
CREATE INDEX idx_plan_instrument_ce_inst  ON public.plan_instrument_ce(instrument_id);

-- ─── Enable RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.plan_teaching_unit  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_unit_ra        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_instrument     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_instrument_unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_instrument_ce  ENABLE ROW LEVEL SECURITY;

-- ─── RLS: plan_teaching_unit ───────────────────────────────────────────────
CREATE POLICY "ptu_select" ON public.plan_teaching_unit
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teaching_plans tp WHERE tp.id = plan_teaching_unit.plan_id
  ));

CREATE POLICY "ptu_manage" ON public.plan_teaching_unit
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teaching_plans tp
    WHERE tp.id = plan_teaching_unit.plan_id
      AND (public.is_platform_admin()
        OR (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
        OR public.is_org_manager(tp.organization_id))
  ));

-- ─── RLS: plan_unit_ra ─────────────────────────────────────────────────────
CREATE POLICY "pur_select" ON public.plan_unit_ra
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_teaching_unit ptu WHERE ptu.id = plan_unit_ra.unit_id
  ));

CREATE POLICY "pur_manage" ON public.plan_unit_ra
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_teaching_unit ptu
    JOIN public.teaching_plans tp ON tp.id = ptu.plan_id
    WHERE ptu.id = plan_unit_ra.unit_id
      AND (public.is_platform_admin()
        OR (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
        OR public.is_org_manager(tp.organization_id))
  ));

-- ─── RLS: plan_instrument ──────────────────────────────────────────────────
CREATE POLICY "pi_select" ON public.plan_instrument
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teaching_plans tp WHERE tp.id = plan_instrument.plan_id
  ));

CREATE POLICY "pi_manage" ON public.plan_instrument
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teaching_plans tp
    WHERE tp.id = plan_instrument.plan_id
      AND (public.is_platform_admin()
        OR (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
        OR public.is_org_manager(tp.organization_id))
  ));

-- ─── RLS: plan_instrument_unit ─────────────────────────────────────────────
CREATE POLICY "piu_select" ON public.plan_instrument_unit
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_instrument pi WHERE pi.id = plan_instrument_unit.instrument_id
  ));

CREATE POLICY "piu_manage" ON public.plan_instrument_unit
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_instrument pi
    JOIN public.teaching_plans tp ON tp.id = pi.plan_id
    WHERE pi.id = plan_instrument_unit.instrument_id
      AND (public.is_platform_admin()
        OR (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
        OR public.is_org_manager(tp.organization_id))
  ));

-- ─── RLS: plan_instrument_ce ───────────────────────────────────────────────
CREATE POLICY "pic_select" ON public.plan_instrument_ce
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_instrument pi WHERE pi.id = plan_instrument_ce.instrument_id
  ));

CREATE POLICY "pic_manage" ON public.plan_instrument_ce
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_instrument pi
    JOIN public.teaching_plans tp ON tp.id = pi.plan_id
    WHERE pi.id = plan_instrument_ce.instrument_id
      AND (public.is_platform_admin()
        OR (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
        OR public.is_org_manager(tp.organization_id))
  ));
