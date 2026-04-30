/**
 * Evaluation Module Types
 */

export type TrimesterKey = 'T1' | 'T2' | 'T3';

export interface EvaluationContext {
  id: string;
  organization_id: string;
  created_by_profile_id: string;
  academic_year: string;
  title: string;
  archived_at?: string | null;
  created_at: string;

  // Relations
  plan_ids?: string[];
  plan_count?: number;
  student_count?: number;
  plan_names?: string[];
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
  notes: string | null;
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

export interface EvaluationTrimesterLocks {
  context_id: string;
  t1_auto_closed: boolean;
  t2_auto_closed: boolean;
  t3_auto_closed: boolean;
  updated_by_profile_id: string | null;
  updated_at: string;
}

export interface EvaluationTrimesterAdjustedOverride {
  context_id: string;
  student_id: string;
  trimester_key: TrimesterKey;
  adjusted_grade: number;
  updated_by_profile_id: string | null;
  updated_at: string;
}

export interface EvaluationTrimesterAutoSnapshot {
  context_id: string;
  student_id: string;
  trimester_key: TrimesterKey;
  auto_grade: number | null;
  completion_percent: number;
  captured_at: string;
}

export interface EvaluationRAManualOverride {
  context_id: string;
  student_id: string;
  plan_ra_id: string;
  improved_grade: number;
  updated_by_profile_id: string | null;
  updated_at: string;
}

export interface EvaluationFinalManualOverride {
  context_id: string;
  student_id: string;
  improved_final_grade: number;
  updated_by_profile_id: string | null;
  updated_at: string;
}

export interface StudentTrimesterGradeSummary {
  key: TrimesterKey;
  autoGrade: number | null;
  autoCompletionPercent: number;
  autoHasMissingData: boolean;
  autoIsLocked: boolean;
  adjustedGrade: number | null;
  adjustedIsManual: boolean;
  adjustedHasMissingData: boolean;
}

export interface StudentRAPriPmiImpact {
  instrumentId: string;
  instrumentCode: string;
  instrumentName: string;
  scoreValue: number;
  scoreDate: string | null;
  isApplied: boolean;
}

export interface StudentRAGradeSummary {
  raId: string;
  raCode: string;
  weightInPlan: number;
  originalGrade: number | null;
  originalCompletionPercent: number;
  originalHasMissingData: boolean;
  improvedAutoGrade: number | null;
  improvedGrade: number | null;
  improvedCompletionPercent: number;
  improvedHasMissingData: boolean;
  improvedIsManual: boolean;
  priPmiImpacts: StudentRAPriPmiImpact[];
}

/** Computed grade for a student at different levels */
export interface StudentGradeSummary {
  studentId: string;
  studentName: string;
  studentFirstName: string;
  studentLastName: string | null;
  // Legacy aliases kept for compatibility with existing consumers
  finalGrade: number | null;
  finalCompletionPercent: number;
  // Final grade columns
  finalOriginalAutoGrade: number | null;
  finalOriginalCompletionPercent: number;
  finalOriginalHasMissingData: boolean;
  finalImprovedAutoGrade: number | null;
  finalImprovedGrade: number | null;
  finalImprovedCompletionPercent: number;
  finalImprovedHasMissingData: boolean;
  finalImprovedIsManual: boolean;
  // Per RA (original vs improved)
  raGrades: StudentRAGradeSummary[];
  // Per trimester (auto vs adjusted)
  trimesterGrades: StudentTrimesterGradeSummary[];
}

export interface RAReference {
  raId: string;
  raCode: string;
}

export type { GradeComputationResult } from "./grade-engine";
