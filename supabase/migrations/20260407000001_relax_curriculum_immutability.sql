-- Relax curriculum immutability to allow corrections in published templates
-- Date: 2026-04-07

-- 1. Remove old immutability triggers (they were bound to BEFORE UPDATE OR DELETE)
DROP TRIGGER IF EXISTS trigger_templates_immutability ON public.curriculum_templates;
DROP TRIGGER IF EXISTS trigger_ra_immutability ON public.template_ra;
DROP TRIGGER IF EXISTS trigger_ce_immutability ON public.template_ce;

-- 2. Update Template management policy (curriculum_templates)
-- Remove 'draft' check to allow creators/managers to edit published templates
DROP POLICY IF EXISTS "templates_manage_policy" ON public.curriculum_templates;
CREATE POLICY "templates_manage_policy" ON public.curriculum_templates
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR created_by_profile_id = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM public.organization_memberships 
            WHERE profile_id = auth.uid() AND role_in_org = 'org_manager' AND is_active = TRUE
        )
    );

-- 3. Update RA management policy
-- Remove 'draft' status check for the parent template
DROP POLICY IF EXISTS "ra_manage_policy" ON public.template_ra;
CREATE POLICY "ra_manage_policy" ON public.template_ra
    FOR ALL TO authenticated
    USING (
        template_id IN (
            SELECT id FROM public.curriculum_templates 
            WHERE (
                created_by_profile_id = auth.uid() 
                OR organization_id IN (
                    SELECT organization_id FROM public.organization_memberships 
                    WHERE profile_id = auth.uid() AND role_in_org = 'org_manager' AND is_active = TRUE
                )
            )
        )
    );

-- 4. Update CE management policy
-- Remove 'draft' status check for the ancestor template
DROP POLICY IF EXISTS "ce_manage_policy" ON public.template_ce;
CREATE POLICY "ce_manage_policy" ON public.template_ce
    FOR ALL TO authenticated
    USING (
        template_ra_id IN (
            SELECT ra.id FROM public.template_ra ra
            JOIN public.curriculum_templates ct ON ct.id = ra.template_id
            WHERE (
                ct.created_by_profile_id = auth.uid() 
                OR ct.organization_id IN (
                    SELECT organization_id FROM public.organization_memberships 
                    WHERE profile_id = auth.uid() AND role_in_org = 'org_manager' AND is_active = TRUE
                )
            )
        )
    );
