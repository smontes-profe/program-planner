-- 2. Phase 2: Curriculum Templates Schema

-- 1. Tables

-- Curriculum Templates
CREATE TABLE public.curriculum_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    region_code TEXT NOT NULL REFERENCES public.regions(code),
    module_code TEXT NOT NULL,
    module_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated')),
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'pdf_assisted')),
    visibility_scope TEXT NOT NULL DEFAULT 'organization' CHECK (visibility_scope IN ('private', 'organization', 'company')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- academic_year must follow format YYYY/YYYY (e.g., 2026/2027)
    CONSTRAINT valid_academic_year CHECK (academic_year ~ '^\d{4}/\d{4}$'),
    -- Unique version key
    UNIQUE (organization_id, region_code, module_code, academic_year, version)
);

-- Template RA (Resultados de Aprendizaje)
-- Represents higher level learning outcomes in a template
CREATE TABLE public.template_ra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.curriculum_templates(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    weight_in_template NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight_in_template >= 0 AND weight_in_template <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template CE (Criterios de Evaluación)
-- Represents specific evaluation criteria under an RA
CREATE TABLE public.template_ce (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_ra_id UUID NOT NULL REFERENCES public.template_ra(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    weight_in_ra NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight_in_ra >= 0 AND weight_in_ra <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for common searches
CREATE INDEX idx_curriculum_templates_org ON public.curriculum_templates(organization_id);
CREATE INDEX idx_curriculum_templates_status ON public.curriculum_templates(status);
CREATE INDEX idx_template_ra_template ON public.template_ra(template_id);
CREATE INDEX idx_template_ce_ra ON public.template_ce(template_ra_id);

-- 3. Immutability Trigger
-- Published/Deprecated templates and their child entities cannot be modified or deleted.
CREATE OR REPLACE FUNCTION public.check_template_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    -- For RA/CE, find the parent template status
    IF TG_TABLE_NAME = 'curriculum_templates' THEN
        v_status := OLD.status;
    ELSEIF TG_TABLE_NAME = 'template_ra' THEN
        SELECT status INTO v_status FROM public.curriculum_templates WHERE id = OLD.template_id;
    ELSEIF TG_TABLE_NAME = 'template_ce' THEN
        SELECT ct.status INTO v_status 
        FROM public.curriculum_templates ct
        JOIN public.template_ra ra ON ra.template_id = ct.id
        WHERE ra.id = OLD.template_ra_id;
    END IF;

    IF v_status IN ('published', 'deprecated') THEN
        -- Allow status changes on the template itself (e.g. published -> deprecated)
        -- but block any other field changes or deletions
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Cannot delete entities belonging to a published or deprecated template.';
        END IF;

        IF TG_OP = 'UPDATE' THEN
            IF TG_TABLE_NAME = 'curriculum_templates' THEN
                -- Only status update is allowed
                IF (OLD.* IS DISTINCT FROM NEW.*) AND (OLD.status = NEW.status OR OLD.status IN ('published', 'deprecated')) THEN
                    -- Special case: allow published -> deprecated
                    IF OLD.status = 'published' AND NEW.status = 'deprecated' THEN
                        -- Allow this specific update ONLY for status field
                        -- We'll check if only status changed
                        IF OLD.organization_id = NEW.organization_id AND 
                           OLD.created_by_profile_id = NEW.created_by_profile_id AND
                           OLD.region_code = NEW.region_code AND
                           OLD.module_code = NEW.module_code AND
                           OLD.module_name = NEW.module_name AND
                           OLD.academic_year = NEW.academic_year AND
                           OLD.version = NEW.version AND
                           OLD.source_type = NEW.source_type AND
                           OLD.visibility_scope = NEW.visibility_scope THEN
                           RETURN NEW;
                        END IF;
                    END IF;
                    RAISE EXCEPTION 'Cannot update fields of a published or deprecated template except for status transitions.';
                END IF;
            ELSE
                RAISE EXCEPTION 'Cannot update entities belonging to a published or deprecated template.';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_templates_immutability
    BEFORE UPDATE OR DELETE ON public.curriculum_templates
    FOR EACH ROW EXECUTE FUNCTION public.check_template_immutability();

CREATE TRIGGER trigger_ra_immutability
    BEFORE UPDATE OR DELETE ON public.template_ra
    FOR EACH ROW EXECUTE FUNCTION public.check_template_immutability();

CREATE TRIGGER trigger_ce_immutability
    BEFORE UPDATE OR DELETE ON public.template_ce
    FOR EACH ROW EXECUTE FUNCTION public.check_template_immutability();

-- 4. RLS Policies

ALTER TABLE public.curriculum_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_ra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_ce ENABLE ROW LEVEL SECURITY;

-- Curriculum Templates Policies
CREATE POLICY "templates_read_policy" ON public.curriculum_templates
    FOR SELECT TO authenticated
    USING (
        -- Global access for platform admins
        public.is_platform_admin()
        -- Visibility: company (any authenticated member)
        OR visibility_scope = 'company'
        -- Visibility: organization (members of same org)
        OR (visibility_scope = 'organization' AND organization_id IN (
            SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND is_active = TRUE
        ))
        -- Visibility: private (creator or org manager of same org)
        OR (visibility_scope = 'private' AND (
            created_by_profile_id = auth.uid()
            OR organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND role_in_org = 'org_manager' AND is_active = TRUE
            )
        ))
    );

CREATE POLICY "templates_insert_policy" ON public.curriculum_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Platform admins can do anything
        public.is_platform_admin()
        -- Members of the organization can create templates
        OR organization_id IN (
            SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND is_active = TRUE
        )
    );

CREATE POLICY "templates_manage_policy" ON public.curriculum_templates
    FOR ALL TO authenticated
    USING (
        -- Platform admins
        public.is_platform_admin()
        -- Creator can manage their draft
        OR (created_by_profile_id = auth.uid() AND status = 'draft')
        -- Org manager can manage any template in their org
        OR organization_id IN (
            SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND role_in_org = 'org_manager' AND is_active = TRUE
        )
    );

-- RA/CE policies (inherit from template visibility)
CREATE POLICY "ra_read_policy" ON public.template_ra
    FOR SELECT TO authenticated
    USING (
        template_id IN (SELECT id FROM public.curriculum_templates)
    );

CREATE POLICY "ra_manage_policy" ON public.template_ra
    FOR ALL TO authenticated
    USING (
        template_id IN (
            SELECT id FROM public.curriculum_templates 
            WHERE status = 'draft' AND (
                created_by_profile_id = auth.uid() 
                OR organization_id IN (
                    SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND role_in_org = 'org_manager' AND is_active = TRUE
                )
            )
        )
    );

CREATE POLICY "ce_read_policy" ON public.template_ce
    FOR SELECT TO authenticated
    USING (
        template_ra_id IN (SELECT id FROM public.template_ra)
    );

CREATE POLICY "ce_manage_policy" ON public.template_ce
    FOR ALL TO authenticated
    USING (
        template_ra_id IN (
            SELECT ra.id FROM public.template_ra ra
            JOIN public.curriculum_templates ct ON ct.id = ra.template_id
            WHERE ct.status = 'draft' AND (
                ct.created_by_profile_id = auth.uid() 
                OR ct.organization_id IN (
                    SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND role_in_org = 'org_manager' AND is_active = TRUE
                )
            )
        )
    );
