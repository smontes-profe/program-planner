export type PlanStatus = 'draft' | 'published';
export type VisibilityScope = 'private' | 'organization';

export interface TeachingPlan {
  id: string;
  organization_id: string;
  owner_profile_id: string;
  source_plan_id: string | null;
  source_template_id: string | null;
  source_version: string | null;
  title: string;
  region_code: string;
  module_code: string;
  academic_year: string;
  visibility_scope: VisibilityScope;
  status: PlanStatus;
  hours_total: number;
  ce_weight_auto: boolean;
  imported_at: string | null;
  created_at: string;
  owner_name?: string | null;
  source_template_name?: string | null;
  program_title?: string | null;
  program_code?: string | null;
  program_level?: string | null;
  program_course?: string | null;
  is_owner?: boolean;
  can_edit?: boolean;
}

export interface PlanRA {
  id: string;
  plan_id: string;
  code: string;
  description: string;
  weight_global: number;
  active_t1: boolean;
  active_t2: boolean;
  active_t3: boolean;
  order_index: number;
  created_at: string;
  // Nested
  ces?: PlanCE[];
}

export interface PlanCE {
  id: string;
  plan_ra_id: string;
  code: string;
  description: string;
  weight_in_ra: number;
  order_index: number;
  created_at: string;
}

export type Trimester = 'T1' | 'T2' | 'T3';
export type InstrumentType = 'exam' | 'practice' | 'project' | 'oral' | 'activity' | 'other';

export interface PlanTeachingUnit {
  id: string;
  plan_id: string;
  code: string;
  title: string;
  active_t1: boolean;
  active_t2: boolean;
  active_t3: boolean;
  hours: number;
  order_index: number;
  created_at: string;
  
  // Relations
  ra_ids?: string[]; // IDs of RAs this unit covers
}

export interface PlanInstrumentCE {
  instrument_id: string;
  plan_ce_id: string;
  weight: number;
}

/** RA coverage entry for an instrument: what % of the RA this instrument covers */
export interface PlanInstrumentRA {
  instrument_id: string;
  plan_ra_id: string;
  coverage_percent: number;
}

export interface PlanInstrument {
  id: string;
  plan_id: string;
  code: string;
  type: InstrumentType;
  is_pri_pmi: boolean;
  ce_weight_auto: boolean;
  name: string;
  description: string | null;
  created_at: string;
  
  // Relations
  unit_ids?: string[]; // IDs of units this instrument belongs to
  ra_ids?: string[]; // IDs of RAs this instrument evaluates
  ra_coverages?: PlanInstrumentRA[]; // RA coverage with percentages
  ce_weights?: PlanInstrumentCE[]; // Weights for CEs
}

export interface TeachingPlanFull extends TeachingPlan {
  ras: PlanRA[];
  units?: PlanTeachingUnit[];
  instruments?: PlanInstrument[];
  sourceTemplateHours?: number; // to show target hours
}
