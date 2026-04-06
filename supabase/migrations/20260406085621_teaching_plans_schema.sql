-- Create ENUM-like check constraints using TEXT variables
CREATE TABLE public.teaching_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_plan_id UUID REFERENCES public.teaching_plans(id) ON DELETE SET NULL,
    source_template_id UUID REFERENCES public.curriculum_templates(id) ON DELETE SET NULL,
    source_version TEXT,
    title TEXT NOT NULL,
    region_code TEXT NOT NULL REFERENCES public.regions(code),
    module_code TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('private', 'organization', 'company')) DEFAULT 'private',
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'published', 'archived')) DEFAULT 'draft',
    imported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.plan_ra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.teaching_plans(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    weight_in_plan NUMERIC NOT NULL DEFAULT 0 CHECK (weight_in_plan >= 0 AND weight_in_plan <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(plan_id, code)
);

CREATE TABLE public.plan_ce (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_ra_id UUID NOT NULL REFERENCES public.plan_ra(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    weight_in_ra NUMERIC NOT NULL DEFAULT 0 CHECK (weight_in_ra >= 0 AND weight_in_ra <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(plan_ra_id, code)
);

-- Enable RLS
ALTER TABLE public.teaching_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_ra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_ce ENABLE ROW LEVEL SECURITY;

-- Create Indexes for performance
CREATE INDEX idx_teaching_plans_org ON public.teaching_plans(organization_id);
CREATE INDEX idx_teaching_plans_owner ON public.teaching_plans(owner_profile_id);
CREATE INDEX idx_plan_ra_plan ON public.plan_ra(plan_id);
CREATE INDEX idx_plan_ce_ra ON public.plan_ce(plan_ra_id);

-- RLS for teaching_plans
CREATE POLICY "plans_select_policy" ON public.teaching_plans
    FOR SELECT TO authenticated
    USING (
        -- platform admin can read
        public.is_platform_admin() 
        OR 
        -- company visibility: accessible by any active user in any org (auth.uid check handles authenticated state)
        visibility_scope = 'company'
        OR 
        -- organization visibility: accessible if you belong to the same organization
        (visibility_scope = 'organization' AND public.check_user_membership(organization_id))
        OR 
        -- private: accessible if you are owner, OR an org_manager of the same org
        (visibility_scope = 'private' AND (owner_profile_id = auth.uid() OR public.is_org_manager(organization_id)))
    );

CREATE POLICY "plans_insert_policy" ON public.teaching_plans
    FOR INSERT TO authenticated
    WITH CHECK (
        -- can insert if you are platform admin or you are an active member of this organization
        public.is_platform_admin() 
        OR 
        public.check_user_membership(organization_id)
    );

CREATE POLICY "plans_update_policy" ON public.teaching_plans
    FOR UPDATE TO authenticated
    USING (
        -- can update if platform admin, or owner and an active member, or org_manager
        public.is_platform_admin()
        OR 
        (owner_profile_id = auth.uid() AND public.check_user_membership(organization_id))
        OR 
        public.is_org_manager(organization_id)
    );

CREATE POLICY "plans_delete_policy" ON public.teaching_plans
    FOR DELETE TO authenticated
    USING (
        -- same as update
        public.is_platform_admin()
        OR 
        (owner_profile_id = auth.uid() AND public.check_user_membership(organization_id))
        OR 
        public.is_org_manager(organization_id)
    );

-- RLS for plan_ra (inherit from teaching_plans via subquery)
CREATE POLICY "plan_ra_select_policy" ON public.plan_ra
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.teaching_plans tp 
            WHERE tp.id = plan_ra.plan_id
        )
    );

CREATE POLICY "plan_ra_manage_policy" ON public.plan_ra
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.teaching_plans tp 
            WHERE tp.id = plan_ra.plan_id 
              AND (
                  public.is_platform_admin() 
                  OR 
                  (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
                  OR 
                  public.is_org_manager(tp.organization_id)
              )
        )
    );

-- RLS for plan_ce (inherit from teaching_plans through plan_ra)
CREATE POLICY "plan_ce_select_policy" ON public.plan_ce
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.plan_ra pra
            JOIN public.teaching_plans tp ON tp.id = pra.plan_id
            WHERE pra.id = plan_ce.plan_ra_id
        )
    );

CREATE POLICY "plan_ce_manage_policy" ON public.plan_ce
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.plan_ra pra
            JOIN public.teaching_plans tp ON tp.id = pra.plan_id
            WHERE pra.id = plan_ce.plan_ra_id
              AND (
                  public.is_platform_admin() 
                  OR 
                  (tp.owner_profile_id = auth.uid() AND public.check_user_membership(tp.organization_id))
                  OR 
                  public.is_org_manager(tp.organization_id)
              )
        )
    );
