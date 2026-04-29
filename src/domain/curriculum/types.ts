/**
 * Curriculum Template Status
 */
export type CurriculumStatus = 'draft' | 'published' | 'deprecated' | 'archived';

/**
 * Source types for curriculum data
 */
export type CurriculumSourceType = 'manual' | 'pdf_assisted';

/**
 * Visibility scopes for templates and plans
 */
export type VisibilityScope = 'private' | 'organization';

/**
 * Base Curriculum Template
 */
export interface CurriculumTemplate {
  id: string;
  organization_id: string;
  created_by_profile_id: string;
  region_code: string;
  module_code: string;
  module_name: string;
  academic_year: string;
  version: string;
  status: CurriculumStatus;
  source_type: CurriculumSourceType;
  visibility_scope: VisibilityScope;
  hours_total: number;
  program_title?: string | null;
  program_code?: string | null;
  program_level?: 'FP Básica' | 'Grado Medio' | 'Grado Superior' | 'Máster' | null;
  program_course?: 'Primero' | 'Segundo' | 'NA' | null;
  archived_at?: string | null;
  created_at: string;
  creator_name?: string | null;
  creator_email?: string | null;
  is_owner?: boolean;
  can_edit?: boolean;
}

/**
 * Template RA (Resultado de Aprendizaje)
 */
export interface TemplateRA {
  id: string;
  template_id: string;
  code: string;
  description: string;
  order_index: number;
  created_at: string;
}

/**
 * Template CE (Criterio de Evaluación)
 */
export interface TemplateCE {
  id: string;
  template_ra_id: string;
  code: string;
  description: string;
  order_index: number;
  created_at: string;
}

/**
 * Full Template with nested RA/CE
 */
export interface CurriculumTemplateWithContent extends CurriculumTemplate {
  ras: (TemplateRA & {
    ces: TemplateCE[];
  })[];
}
