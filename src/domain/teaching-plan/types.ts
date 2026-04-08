export type PlanStatus = 'draft' | 'ready' | 'published' | 'archived';
export type VisibilityScope = 'private' | 'organization' | 'company';

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
  imported_at: string | null;
  created_at: string;
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
export type InstrumentType = 'exam' | 'practice' | 'project' | 'oral' | 'other';

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

export interface PlanInstrument {
  id: string;
  plan_id: string;
  type: InstrumentType;
  name: string;
  description: string | null;
  created_at: string;
  
  // Relations
  unit_ids?: string[]; // IDs of units this instrument belongs to
  ce_weights?: PlanInstrumentCE[]; // Weights for CEs
}

export interface TeachingPlanFull extends TeachingPlan {
  ras: PlanRA[];
  units?: PlanTeachingUnit[];
  instruments?: PlanInstrument[];
  sourceTemplateHours?: number; // to show target hours
}
