-- Phase 3.6: Evaluation Module — contexts, students, scores
-- Date: 2026-04-11

-- ─── 1. Evaluation Contexts ─────────────────────────────────────────────────
-- Groups students + teaching plans + scores for an academic year.
CREATE TABLE public.evaluation_contexts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year           TEXT NOT NULL CHECK (academic_year ~ '^\d{4}/\d{4}$'),
  title                   TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_contexts_org ON public.evaluation_contexts(organization_id);
CREATE INDEX idx_eval_contexts_year  ON public.evaluation_contexts(academic_year);

-- ─── 2. Context ↔ Teaching Plans (which modules are being evaluated) ─────────
CREATE TABLE public.evaluation_context_modules (
  context_id             UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  teaching_plan_id       UUID NOT NULL REFERENCES public.teaching_plans(id) ON DELETE CASCADE,
  PRIMARY KEY (context_id, teaching_plan_id)
);

-- Only published plans can be linked (enforced at app level + RLS).
CREATE INDEX idx_ecm_context ON public.evaluation_context_modules(context_id);
CREATE INDEX idx_ecm_plan    ON public.evaluation_context_modules(teaching_plan_id);

-- ─── 3. Students ─────────────────────────────────────────────────────────────
CREATE TABLE public.evaluation_students (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id             UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  student_name           TEXT NOT NULL,
  student_email          TEXT,
  active                 BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_students_context ON public.evaluation_students(context_id);

-- ─── 4. Instrument Scores (one row = one student + one instrument + one CE) ─
CREATE TABLE public.instrument_student_scores (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id             UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  instrument_id          UUID NOT NULL REFERENCES public.plan_instrument(id) ON DELETE CASCADE,
  student_id             UUID NOT NULL REFERENCES public.evaluation_students(id) ON DELETE CASCADE,
  plan_ce_id             UUID,
  score_value            NUMERIC(5,2) CHECK (score_value >= 0 AND score_value <= 10),
  score_date             DATE DEFAULT now(),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scores_context   ON public.instrument_student_scores(context_id);
CREATE INDEX idx_scores_instrument ON public.instrument_student_scores(instrument_id);
CREATE INDEX idx_scores_student   ON public.instrument_student_scores(student_id);
CREATE INDEX idx_scores_ce        ON public.instrument_student_scores(plan_ce_id);

-- Unique: one score per student + instrument + CE (or null CE for simple mode)
CREATE UNIQUE INDEX idx_scores_unique ON public.instrument_student_scores(
  context_id, instrument_id, student_id, COALESCE(plan_ce_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────

-- evaluation_contexts
ALTER TABLE public.evaluation_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ec_select" ON public.evaluation_contexts
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.profile_id = auth.uid()
        AND om.organization_id = evaluation_contexts.organization_id
        AND om.is_active = true
    )
  );

CREATE POLICY "ec_insert" ON public.evaluation_contexts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.profile_id = auth.uid()
        AND om.organization_id = evaluation_contexts.organization_id
        AND om.is_active = true
        AND om.role_in_org IN ('org_manager', 'teacher')
    )
  );

CREATE POLICY "ec_update" ON public.evaluation_contexts
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.profile_id = auth.uid()
        AND om.organization_id = evaluation_contexts.organization_id
        AND om.is_active = true
        AND om.role_in_org IN ('org_manager', 'teacher')
    )
  );

CREATE POLICY "ec_delete" ON public.evaluation_contexts
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.profile_id = auth.uid()
        AND om.organization_id = evaluation_contexts.organization_id
        AND om.is_active = true
        AND om.role_in_org = 'org_manager'
    )
  );

-- evaluation_context_modules
ALTER TABLE public.evaluation_context_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecm_select" ON public.evaluation_context_modules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_context_modules.context_id
  ));

CREATE POLICY "ecm_manage" ON public.evaluation_context_modules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_context_modules.context_id
      AND (public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        ))
  ));

-- evaluation_students
ALTER TABLE public.evaluation_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "es_select" ON public.evaluation_students
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_students.context_id
  ));

CREATE POLICY "es_manage" ON public.evaluation_students
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = evaluation_students.context_id
      AND (public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        ))
  ));

-- instrument_student_scores
ALTER TABLE public.instrument_student_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iss_select" ON public.instrument_student_scores
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = instrument_student_scores.context_id
  ));

CREATE POLICY "iss_manage" ON public.instrument_student_scores
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_contexts ec
    WHERE ec.id = instrument_student_scores.context_id
      AND (public.is_platform_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = auth.uid()
            AND om.organization_id = ec.organization_id
            AND om.is_active = true
            AND om.role_in_org IN ('org_manager', 'teacher')
        ))
  ));
