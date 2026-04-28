-- Restrict visibility scopes to private and organization only
-- and make private scope creator-only for curricula and plans.

-- Normalize existing rows that still use the removed scope.
UPDATE public.curriculum_templates
SET visibility_scope = 'organization'
WHERE visibility_scope = 'company';

UPDATE public.teaching_plans
SET visibility_scope = 'organization'
WHERE visibility_scope = 'company';

-- Rebuild curriculum template checks
ALTER TABLE public.curriculum_templates
  DROP CONSTRAINT IF EXISTS curriculum_templates_visibility_scope_check;

ALTER TABLE public.curriculum_templates
  ADD CONSTRAINT curriculum_templates_visibility_scope_check
  CHECK (visibility_scope IN ('private', 'organization'));

ALTER TABLE public.curriculum_templates
  ALTER COLUMN visibility_scope SET DEFAULT 'organization';

-- Rebuild teaching plan checks
ALTER TABLE public.teaching_plans
  DROP CONSTRAINT IF EXISTS teaching_plans_visibility_scope_check;

ALTER TABLE public.teaching_plans
  ADD CONSTRAINT teaching_plans_visibility_scope_check
  CHECK (visibility_scope IN ('private', 'organization'));

ALTER TABLE public.teaching_plans
  ALTER COLUMN visibility_scope SET DEFAULT 'private';

-- Curriculum templates: private only creator, organization only same org members
DROP POLICY IF EXISTS "templates_read_policy" ON public.curriculum_templates;
CREATE POLICY "templates_read_policy" ON public.curriculum_templates
  FOR SELECT TO authenticated
  USING (
    (visibility_scope = 'private' AND created_by_profile_id = auth.uid())
    OR (visibility_scope = 'organization' AND public.check_user_membership(organization_id))
  );

DROP POLICY IF EXISTS "templates_insert_policy" ON public.curriculum_templates;
CREATE POLICY "templates_insert_policy" ON public.curriculum_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.check_user_membership(organization_id)
  );

DROP POLICY IF EXISTS "templates_manage_policy" ON public.curriculum_templates;
CREATE POLICY "templates_manage_policy" ON public.curriculum_templates
  FOR ALL TO authenticated
  USING (
    (
      visibility_scope = 'private'
      AND created_by_profile_id = auth.uid()
    )
    OR (
      visibility_scope = 'organization'
      AND (
        created_by_profile_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id
          FROM public.organization_memberships
          WHERE profile_id = auth.uid()
            AND role_in_org = 'org_manager'
            AND is_active = TRUE
        )
      )
    )
  )
  WITH CHECK (
    (
      visibility_scope = 'private'
      AND created_by_profile_id = auth.uid()
    )
    OR (
      visibility_scope = 'organization'
      AND (
        created_by_profile_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id
          FROM public.organization_memberships
          WHERE profile_id = auth.uid()
            AND role_in_org = 'org_manager'
            AND is_active = TRUE
        )
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
          OR (ct.visibility_scope = 'organization' AND public.check_user_membership(ct.organization_id))
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
          OR (ct.visibility_scope = 'organization' AND public.check_user_membership(ct.organization_id))
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
            AND (
              ct.created_by_profile_id = auth.uid()
              OR public.is_org_manager(ct.organization_id)
            )
          )
        )
    )
  );

-- Teaching plans: private only creator, organization shared within org.
DROP POLICY IF EXISTS "plans_select_policy" ON public.teaching_plans;
CREATE POLICY "plans_select_policy" ON public.teaching_plans
  FOR SELECT TO authenticated
  USING (
    (visibility_scope = 'private' AND owner_profile_id = auth.uid())
    OR (visibility_scope = 'organization' AND public.check_user_membership(organization_id))
  );

DROP POLICY IF EXISTS "plans_insert_policy" ON public.teaching_plans;
CREATE POLICY "plans_insert_policy" ON public.teaching_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.check_user_membership(organization_id)
  );

DROP POLICY IF EXISTS "plans_update_policy" ON public.teaching_plans;
CREATE POLICY "plans_update_policy" ON public.teaching_plans
  FOR UPDATE TO authenticated
  USING (
    (
      visibility_scope = 'private'
      AND owner_profile_id = auth.uid()
    )
    OR (
      visibility_scope = 'organization'
      AND (
        owner_profile_id = auth.uid()
        OR public.is_org_manager(organization_id)
      )
    )
  )
  WITH CHECK (
    (
      visibility_scope = 'private'
      AND owner_profile_id = auth.uid()
    )
    OR (
      visibility_scope = 'organization'
      AND (
        owner_profile_id = auth.uid()
        OR public.is_org_manager(organization_id)
      )
    )
  );

DROP POLICY IF EXISTS "plans_delete_policy" ON public.teaching_plans;
CREATE POLICY "plans_delete_policy" ON public.teaching_plans
  FOR DELETE TO authenticated
  USING (
    (
      visibility_scope = 'private'
      AND owner_profile_id = auth.uid()
    )
    OR (
      visibility_scope = 'organization'
      AND (
        owner_profile_id = auth.uid()
        OR public.is_org_manager(organization_id)
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
          OR (tp.visibility_scope = 'organization' AND public.check_user_membership(tp.organization_id))
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
              tp.owner_profile_id = auth.uid()
              OR public.is_org_manager(tp.organization_id)
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
              tp.owner_profile_id = auth.uid()
              OR public.is_org_manager(tp.organization_id)
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
          OR (tp.visibility_scope = 'organization' AND public.check_user_membership(tp.organization_id))
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
              tp.owner_profile_id = auth.uid()
              OR public.is_org_manager(tp.organization_id)
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
              tp.owner_profile_id = auth.uid()
              OR public.is_org_manager(tp.organization_id)
            )
          )
        )
    )
  );
