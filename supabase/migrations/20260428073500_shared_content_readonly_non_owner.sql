-- Make shared curricula and teaching plans read-only for non-creators.

-- Curriculum templates: only the creator can mutate them.
DROP POLICY IF EXISTS "templates_manage_policy" ON public.curriculum_templates;
CREATE POLICY "templates_manage_policy" ON public.curriculum_templates
  FOR ALL TO authenticated
  USING (created_by_profile_id = auth.uid())
  WITH CHECK (created_by_profile_id = auth.uid());

DROP POLICY IF EXISTS "ra_manage_policy" ON public.template_ra;
CREATE POLICY "ra_manage_policy" ON public.template_ra
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.curriculum_templates ct
      WHERE ct.id = template_ra.template_id
        AND ct.created_by_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.curriculum_templates ct
      WHERE ct.id = template_ra.template_id
        AND ct.created_by_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ce_manage_policy" ON public.template_ce;
CREATE POLICY "ce_manage_policy" ON public.template_ce
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.template_ra ra
      JOIN public.curriculum_templates ct ON ct.id = ra.template_id
      WHERE ra.id = template_ce.template_ra_id
        AND ct.created_by_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.template_ra ra
      JOIN public.curriculum_templates ct ON ct.id = ra.template_id
      WHERE ra.id = template_ce.template_ra_id
        AND ct.created_by_profile_id = auth.uid()
    )
  );

-- Teaching plans: only the creator can mutate them.
DROP POLICY IF EXISTS "plans_update_policy" ON public.teaching_plans;
CREATE POLICY "plans_update_policy" ON public.teaching_plans
  FOR UPDATE TO authenticated
  USING (owner_profile_id = auth.uid())
  WITH CHECK (owner_profile_id = auth.uid());

DROP POLICY IF EXISTS "plans_delete_policy" ON public.teaching_plans;
CREATE POLICY "plans_delete_policy" ON public.teaching_plans
  FOR DELETE TO authenticated
  USING (owner_profile_id = auth.uid());

DROP POLICY IF EXISTS "plan_ra_manage_policy" ON public.plan_ra;
CREATE POLICY "plan_ra_manage_policy" ON public.plan_ra
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_ra.plan_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_ra.plan_id
        AND tp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_ce_manage_policy" ON public.plan_ce;
CREATE POLICY "plan_ce_manage_policy" ON public.plan_ce
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_ra pra
      JOIN public.teaching_plans tp ON tp.id = pra.plan_id
      WHERE pra.id = plan_ce.plan_ra_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_ra pra
      JOIN public.teaching_plans tp ON tp.id = pra.plan_id
      WHERE pra.id = plan_ce.plan_ra_id
        AND tp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ptu_manage" ON public.plan_teaching_unit;
CREATE POLICY "ptu_manage" ON public.plan_teaching_unit
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_teaching_unit.plan_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_teaching_unit.plan_id
        AND tp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pur_manage" ON public.plan_unit_ra;
CREATE POLICY "pur_manage" ON public.plan_unit_ra
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_teaching_unit ptu
      JOIN public.teaching_plans tp ON tp.id = ptu.plan_id
      WHERE ptu.id = plan_unit_ra.unit_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_teaching_unit ptu
      JOIN public.teaching_plans tp ON tp.id = ptu.plan_id
      WHERE ptu.id = plan_unit_ra.unit_id
        AND tp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pi_manage" ON public.plan_instrument;
CREATE POLICY "pi_manage" ON public.plan_instrument
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_instrument.plan_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_instrument.plan_id
        AND tp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "piu_manage" ON public.plan_instrument_unit;
CREATE POLICY "piu_manage" ON public.plan_instrument_unit
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_unit.instrument_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_unit.instrument_id
        AND tp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pir_manage" ON public.plan_instrument_ra;
CREATE POLICY "pir_manage" ON public.plan_instrument_ra
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ra.instrument_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ra.instrument_id
        AND tp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pic_manage" ON public.plan_instrument_ce;
CREATE POLICY "pic_manage" ON public.plan_instrument_ce
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ce.instrument_id
        AND tp.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ce.instrument_id
        AND tp.owner_profile_id = auth.uid()
    )
  );
