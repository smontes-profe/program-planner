-- Phase 3.6.9: PRI/PMI + manual overrides + trimester auto locks
-- Date: 2026-04-16

-- 1) Mark special instruments (PRI/PMI) at plan level
ALTER TABLE public.plan_instrument
  ADD COLUMN IF NOT EXISTS is_pri_pmi BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_plan_instrument_is_pri_pmi
  ON public.plan_instrument(plan_id, is_pri_pmi);

-- 2) Global trimester auto locks per evaluation context
CREATE TABLE IF NOT EXISTS public.evaluation_trimester_locks (
  context_id UUID PRIMARY KEY REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  t1_auto_closed BOOLEAN NOT NULL DEFAULT false,
  t2_auto_closed BOOLEAN NOT NULL DEFAULT false,
  t3_auto_closed BOOLEAN NOT NULL DEFAULT false,
  updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_trimester_locks_updated_at
  ON public.evaluation_trimester_locks(updated_at DESC);

-- 3) Frozen values for auto trimester columns when lock is enabled
CREATE TABLE IF NOT EXISTS public.evaluation_trimester_auto_snapshots (
  context_id UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.evaluation_students(id) ON DELETE CASCADE,
  trimester_key TEXT NOT NULL CHECK (trimester_key IN ('T1', 'T2', 'T3')),
  auto_grade NUMERIC(5,2) CHECK (auto_grade IS NULL OR (auto_grade >= 0 AND auto_grade <= 10)),
  completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (context_id, student_id, trimester_key)
);

CREATE INDEX IF NOT EXISTS idx_eval_trimester_auto_snapshots_context
  ON public.evaluation_trimester_auto_snapshots(context_id);

-- 4) Manual adjusted trimester values (second column stays editable)
CREATE TABLE IF NOT EXISTS public.evaluation_trimester_adjusted_overrides (
  context_id UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.evaluation_students(id) ON DELETE CASCADE,
  trimester_key TEXT NOT NULL CHECK (trimester_key IN ('T1', 'T2', 'T3')),
  adjusted_grade NUMERIC(5,2) NOT NULL CHECK (adjusted_grade >= 0 AND adjusted_grade <= 10),
  updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (context_id, student_id, trimester_key)
);

CREATE INDEX IF NOT EXISTS idx_eval_trimester_adjusted_context
  ON public.evaluation_trimester_adjusted_overrides(context_id);

-- 5) Manual overrides for RA improved column
CREATE TABLE IF NOT EXISTS public.evaluation_ra_manual_overrides (
  context_id UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.evaluation_students(id) ON DELETE CASCADE,
  plan_ra_id UUID NOT NULL REFERENCES public.plan_ra(id) ON DELETE CASCADE,
  improved_grade NUMERIC(5,2) NOT NULL CHECK (improved_grade >= 0 AND improved_grade <= 10),
  updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (context_id, student_id, plan_ra_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_ra_manual_overrides_context
  ON public.evaluation_ra_manual_overrides(context_id);

CREATE INDEX IF NOT EXISTS idx_eval_ra_manual_overrides_ra
  ON public.evaluation_ra_manual_overrides(plan_ra_id);

-- 6) Manual override for improved final grade
CREATE TABLE IF NOT EXISTS public.evaluation_final_manual_overrides (
  context_id UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.evaluation_students(id) ON DELETE CASCADE,
  improved_final_grade NUMERIC(5,2) NOT NULL CHECK (improved_final_grade >= 0 AND improved_final_grade <= 10),
  updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (context_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_final_manual_overrides_context
  ON public.evaluation_final_manual_overrides(context_id);

-- 7) RLS
ALTER TABLE public.evaluation_trimester_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_trimester_auto_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_trimester_adjusted_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_ra_manual_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_final_manual_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etl_select" ON public.evaluation_trimester_locks;
CREATE POLICY "etl_select" ON public.evaluation_trimester_locks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_trimester_locks.context_id
  ));

DROP POLICY IF EXISTS "etl_manage" ON public.evaluation_trimester_locks;
CREATE POLICY "etl_manage" ON public.evaluation_trimester_locks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_trimester_locks.context_id
      AND (
        public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        )
      )
  ));

DROP POLICY IF EXISTS "etas_select" ON public.evaluation_trimester_auto_snapshots;
CREATE POLICY "etas_select" ON public.evaluation_trimester_auto_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_trimester_auto_snapshots.context_id
  ));

DROP POLICY IF EXISTS "etas_manage" ON public.evaluation_trimester_auto_snapshots;
CREATE POLICY "etas_manage" ON public.evaluation_trimester_auto_snapshots
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_trimester_auto_snapshots.context_id
      AND (
        public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        )
      )
  ));

DROP POLICY IF EXISTS "etao_select" ON public.evaluation_trimester_adjusted_overrides;
CREATE POLICY "etao_select" ON public.evaluation_trimester_adjusted_overrides
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_trimester_adjusted_overrides.context_id
  ));

DROP POLICY IF EXISTS "etao_manage" ON public.evaluation_trimester_adjusted_overrides;
CREATE POLICY "etao_manage" ON public.evaluation_trimester_adjusted_overrides
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_trimester_adjusted_overrides.context_id
      AND (
        public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        )
      )
  ));

DROP POLICY IF EXISTS "ermo_select" ON public.evaluation_ra_manual_overrides;
CREATE POLICY "ermo_select" ON public.evaluation_ra_manual_overrides
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_ra_manual_overrides.context_id
  ));

DROP POLICY IF EXISTS "ermo_manage" ON public.evaluation_ra_manual_overrides;
CREATE POLICY "ermo_manage" ON public.evaluation_ra_manual_overrides
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_ra_manual_overrides.context_id
      AND (
        public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        )
      )
  ));

DROP POLICY IF EXISTS "efmo_select" ON public.evaluation_final_manual_overrides;
CREATE POLICY "efmo_select" ON public.evaluation_final_manual_overrides
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_final_manual_overrides.context_id
  ));

DROP POLICY IF EXISTS "efmo_manage" ON public.evaluation_final_manual_overrides;
CREATE POLICY "efmo_manage" ON public.evaluation_final_manual_overrides
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_final_manual_overrides.context_id
      AND (
        public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        )
      )
  ));
