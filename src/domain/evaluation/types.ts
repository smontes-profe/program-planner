/**
 * Evaluation Module Types
 */

export type EvaluationContextStatus = 'draft' | 'active' | 'closed';

export interface EvaluationContext {
  id: string;
  organization_id: string;
  created_by_profile_id: string;
  academic_year: string;
  title: string;
  status: EvaluationContextStatus;
  created_at: string;

  // Relations
  plan_ids?: string[];
  plan_count?: number;
  student_count?: number;
}

export interface EvaluationContextFull extends EvaluationContext {
  plans: {
    id: string;
    title: string;
    module_code: string;
    academic_year: string;
  }[];
  students: EvaluationStudent[];
}

export interface EvaluationStudent {
  id: string;
  context_id: string;
  student_code: string | null;
  last_name: string | null;
  student_name: string;
  student_email: string | null;
  active: boolean;
  created_at: string;
}

export interface InstrumentScore {
  id: string;
  context_id: string;
  instrument_id: string;
  student_id: string;
  plan_ce_id: string | null;
  score_value: number | null;
  score_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Computed grade for a student at different levels */
export interface StudentGradeSummary {
  studentId: string;
  studentName: string;
  studentFirstName: string;
  studentLastName: string | null;
  // Final grade (all RAs combined)
  finalGrade: number | null;
  finalCompletionPercent: number;
  // Per RA
  raGrades: {
    raId: string;
    raCode: string;
    grade: number | null;
    completionPercent: number;
    weightInPlan: number;
  }[];
  // Per trimester
  trimesterGrades: {
    key: 'T1' | 'T2' | 'T3';
    grade: number | null;
    completionPercent: number;
  }[];
}

export interface RAReference {
  raId: string;
  raCode: string;
}

export type { GradeComputationResult } from "./grade-engine";
