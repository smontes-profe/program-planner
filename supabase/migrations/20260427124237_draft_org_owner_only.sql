-- Make organization drafts creator-only for curricula and teaching plans.

-- Curriculum templates
DROP POLICY IF EXISTS "templates_read_policy" ON public.curriculum_templates;
CREATE POLICY "templates_read_policy" ON public.curriculum_templates
  FOR SELECT TO authenticated
  USING (
    (visibility_scope = 'private' AND created_by_profile_id = auth.uid())
    OR (
      visibility_scope = 'organization'
      AND (
        (status = 'draft' AND created_by_profile_id = auth.uid())
        OR (status <> 'draft' AND public.check_user_membership(organization_id))
      )
    )
  );

DROP POLICY IF EXISTS "templates_manage_policy" ON public.curriculum_templates;
CREATE POLICY "templates_manage_policy" ON public.curriculum_templates
  FOR ALL TO authenticated
  USING (
    (visibility_scope = 'private' AND created_by_profile_id = auth.uid())
    OR (
      visibility_scope = 'organization'
      AND (
        (status = 'draft' AND created_by_profile_id = auth.uid())
        OR (status <> 'draft' AND (created_by_profile_id = auth.uid() OR public.is_org_manager(organization_id)))
      )
    )
  )
  WITH CHECK (
    (visibility_scope = 'private' AND created_by_profile_id = auth.uid())
    OR (
      visibility_scope = 'organization'
      AND (
        (status = 'draft' AND created_by_profile_id = auth.uid())
        OR (status <> 'draft' AND (created_by_profile_id = auth.uid() OR public.is_org_manager(organization_id)))
      )
    )
  );

DROP POLICY IF EXISTS "ra_read_policy" ON public.template_ra;
CREATE POLICY "ra_read_policy" ON public.template_ra
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.curriculum_templates ct
      WHERE ct.id = template_ra.template_id
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND (
              (ct.status = 'draft' AND ct.created_by_profile_id = auth.uid())
              OR (ct.status <> 'draft' AND public.check_user_membership(ct.organization_id))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "ra_manage_policy" ON public.template_ra;
CREATE POLICY "ra_manage_policy" ON public.template_ra
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.curriculum_templates ct
      WHERE ct.id = template_ra.template_id
        AND ct.status = 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND ct.created_by_profile_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.curriculum_templates ct
      WHERE ct.id = template_ra.template_id
        AND ct.status <> 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND (
              ct.created_by_profile_id = auth.uid()
              OR public.is_org_manager(ct.organization_id)
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.curriculum_templates ct
      WHERE ct.id = template_ra.template_id
        AND ct.status = 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND ct.created_by_profile_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.curriculum_templates ct
      WHERE ct.id = template_ra.template_id
        AND ct.status <> 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND (
              ct.created_by_profile_id = auth.uid()
              OR public.is_org_manager(ct.organization_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "ce_read_policy" ON public.template_ce;
CREATE POLICY "ce_read_policy" ON public.template_ce
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.template_ra ra
      JOIN public.curriculum_templates ct ON ct.id = ra.template_id
      WHERE ra.id = template_ce.template_ra_id
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND (
              (ct.status = 'draft' AND ct.created_by_profile_id = auth.uid())
              OR (ct.status <> 'draft' AND public.check_user_membership(ct.organization_id))
            )
          )
        )
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
        AND ct.status = 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND ct.created_by_profile_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.template_ra ra
      JOIN public.curriculum_templates ct ON ct.id = ra.template_id
      WHERE ra.id = template_ce.template_ra_id
        AND ct.status <> 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND (
              ct.created_by_profile_id = auth.uid()
              OR public.is_org_manager(ct.organization_id)
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.template_ra ra
      JOIN public.curriculum_templates ct ON ct.id = ra.template_id
      WHERE ra.id = template_ce.template_ra_id
        AND ct.status = 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND ct.created_by_profile_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.template_ra ra
      JOIN public.curriculum_templates ct ON ct.id = ra.template_id
      WHERE ra.id = template_ce.template_ra_id
        AND ct.status <> 'draft'
        AND (
          (ct.visibility_scope = 'private' AND ct.created_by_profile_id = auth.uid())
          OR (
            ct.visibility_scope = 'organization'
            AND (
              ct.created_by_profile_id = auth.uid()
              OR public.is_org_manager(ct.organization_id)
            )
          )
        )
    )
  );

-- Teaching plans
DROP POLICY IF EXISTS "plans_select_policy" ON public.teaching_plans;
CREATE POLICY "plans_select_policy" ON public.teaching_plans
  FOR SELECT TO authenticated
  USING (
    (visibility_scope = 'private' AND owner_profile_id = auth.uid())
    OR (
      visibility_scope = 'organization'
      AND (
        (status = 'draft' AND owner_profile_id = auth.uid())
        OR (status <> 'draft' AND public.check_user_membership(organization_id))
      )
    )
  );

DROP POLICY IF EXISTS "plans_update_policy" ON public.teaching_plans;
CREATE POLICY "plans_update_policy" ON public.teaching_plans
  FOR UPDATE TO authenticated
  USING (
    (visibility_scope = 'private' AND owner_profile_id = auth.uid())
    OR (
      visibility_scope = 'organization'
      AND (
        (status = 'draft' AND owner_profile_id = auth.uid())
        OR (status <> 'draft' AND (owner_profile_id = auth.uid() OR public.is_org_manager(organization_id)))
      )
    )
  )
  WITH CHECK (
    (visibility_scope = 'private' AND owner_profile_id = auth.uid())
    OR (
      visibility_scope = 'organization'
      AND (
        (status = 'draft' AND owner_profile_id = auth.uid())
        OR (status <> 'draft' AND (owner_profile_id = auth.uid() OR public.is_org_manager(organization_id)))
      )
    )
  );

DROP POLICY IF EXISTS "plans_delete_policy" ON public.teaching_plans;
CREATE POLICY "plans_delete_policy" ON public.teaching_plans
  FOR DELETE TO authenticated
  USING (
    (visibility_scope = 'private' AND owner_profile_id = auth.uid())
    OR (
      visibility_scope = 'organization'
      AND (
        (status = 'draft' AND owner_profile_id = auth.uid())
        OR (status <> 'draft' AND (owner_profile_id = auth.uid() OR public.is_org_manager(organization_id)))
      )
    )
  );

DROP POLICY IF EXISTS "plan_ra_select_policy" ON public.plan_ra;
CREATE POLICY "plan_ra_select_policy" ON public.plan_ra
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_ra.plan_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "plan_ra_manage_policy" ON public.plan_ra;
CREATE POLICY "plan_ra_manage_policy" ON public.plan_ra
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_ra.plan_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_ra.plan_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "plan_ce_select_policy" ON public.plan_ce;
CREATE POLICY "plan_ce_select_policy" ON public.plan_ce
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_ra pra
      JOIN public.teaching_plans tp ON tp.id = pra.plan_id
      WHERE pra.id = plan_ce.plan_ra_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
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
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_ra pra
      JOIN public.teaching_plans tp ON tp.id = pra.plan_id
      WHERE pra.id = plan_ce.plan_ra_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "ptu_select" ON public.plan_teaching_unit;
CREATE POLICY "ptu_select" ON public.plan_teaching_unit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_teaching_unit.plan_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
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
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_teaching_unit.plan_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "pur_select" ON public.plan_unit_ra;
CREATE POLICY "pur_select" ON public.plan_unit_ra
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_teaching_unit ptu
      JOIN public.teaching_plans tp ON tp.id = ptu.plan_id
      WHERE ptu.id = plan_unit_ra.unit_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
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
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_teaching_unit ptu
      JOIN public.teaching_plans tp ON tp.id = ptu.plan_id
      WHERE ptu.id = plan_unit_ra.unit_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "pi_select" ON public.plan_instrument;
CREATE POLICY "pi_select" ON public.plan_instrument
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_instrument.plan_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
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
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teaching_plans tp
      WHERE tp.id = plan_instrument.plan_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "piu_select" ON public.plan_instrument_unit;
CREATE POLICY "piu_select" ON public.plan_instrument_unit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_unit.instrument_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
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
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_unit.instrument_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "pir_select" ON public.plan_instrument_ra;
CREATE POLICY "pir_select" ON public.plan_instrument_ra
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ra.instrument_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
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
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ra.instrument_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "pic_select" ON public.plan_instrument_ce;
CREATE POLICY "pic_select" ON public.plan_instrument_ce
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ce.instrument_id
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND public.check_user_membership(tp.organization_id))
            )
          )
        )
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
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_instrument pi
      JOIN public.teaching_plans tp ON tp.id = pi.plan_id
      WHERE pi.id = plan_instrument_ce.instrument_id
        AND tp.status <> 'archived'
        AND (
          (tp.visibility_scope = 'private' AND tp.owner_profile_id = auth.uid())
          OR (
            tp.visibility_scope = 'organization'
            AND (
              (tp.status = 'draft' AND tp.owner_profile_id = auth.uid())
              OR (tp.status <> 'draft' AND (tp.owner_profile_id = auth.uid() OR public.is_org_manager(tp.organization_id)))
            )
          )
        )
    )
  );
