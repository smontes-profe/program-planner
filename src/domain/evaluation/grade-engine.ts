/**
 * Grade Engine for Evaluation Module
 *
 * Computes grades for students based on:
 * - Instrument scores per student
 * - RA weights in the teaching plan (weight_global)
 * - CE weights per RA (weight_in_ra)
 * - Instrument coverage per CE (coverage_percent derived from RA coverage × CE share)
 * - Trimester assignment of UTs
 *
 * Formula (from SPECS.md §6):
 *   ce_grade = sum(instrument_score × instrument_ce_coverage_factor)
 *   ra_grade = sum(ce_grade × ce_weight_in_ra)
 *   final_grade = sum(ra_grade × ra_weight_in_plan)
 */

import type {
  EvaluationContextFull,
  InstrumentScore,
  RAReference,
  StudentGradeSummary,
} from "./types";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";

/** Full grade computation result for all students in a context */
export interface GradeComputationResult {
  studentGrades: StudentGradeSummary[];
  groupStats: {
    averageFinalGrade: number | null;
    medianFinalGrade: number | null;
    stdDevFinalGrade: number | null;
    totalStudents: number;
    gradedStudents: number;
  };
  raReferences: RAReference[];
}

/**
 * Compute grades for all students in an evaluation context.
 */
export function computeAllStudentGrades(
  context: EvaluationContextFull,
  plans: TeachingPlanFull[],
  scores: InstrumentScore[]
): GradeComputationResult {
  const students = context.students.filter(s => s.active);

  // Map scores by student
  const scoresByStudent = new Map<string, InstrumentScore[]>();
  for (const score of scores) {
    const arr = scoresByStudent.get(score.student_id) || [];
    arr.push(score);
    scoresByStudent.set(score.student_id, arr);
  }

  const studentGrades = students.map(student => {
    const studentScores = scoresByStudent.get(student.id) || [];
    return computeSingleStudentGrade(
      student.id,
      student.student_name,
      student.last_name,
      context,
      plans,
      studentScores
    );
  });

  // Group statistics
  const finalGrades = studentGrades
    .map(s => s.finalGrade)
    .filter((g): g is number => g !== null);

  const groupStats = {
    averageFinalGrade: finalGrades.length > 0
      ? finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length
      : null,
    medianFinalGrade: computeMedian(finalGrades),
    stdDevFinalGrade: computeStdDev(finalGrades),
    totalStudents: students.length,
    gradedStudents: studentGrades.filter(s => s.finalGrade !== null).length,
  };

  const raReferences = extractRAReferences(plans);
  return { studentGrades, groupStats, raReferences };
}

/**
 * Compute grades for a single student.
 */
function computeSingleStudentGrade(
  studentId: string,
  studentName: string,
  studentLastName: string | null,
  context: EvaluationContextFull,
  plans: TeachingPlanFull[],
  studentScores: InstrumentScore[]
): StudentGradeSummary {
  const raGrades: StudentGradeSummary["raGrades"] = [];
  const trimesterGrades: StudentGradeSummary["trimesterGrades"] = [];
  let totalWeightWithGrades = 0;
  let weightedGradeSum = 0;

  for (const plan of plans) {
    const planRaGrades = computePlanStudentGrades(plan, studentScores);

    // Per RA
    for (const raGrade of planRaGrades.raGrades) {
      raGrades.push(raGrade);

      if (raGrade.grade !== null) {
        const weight = raGrade.weightInPlan / 100;
        weightedGradeSum += raGrade.grade * weight;
        totalWeightWithGrades += weight;
      }
    }

    // Per trimester (for this plan)
    for (const triGrade of planRaGrades.trimesterGrades) {
      trimesterGrades.push(triGrade);
    }
  }

  // Normalize: if not all RAs have grades, scale by completed weight
  const finalGrade = totalWeightWithGrades > 0
    ? weightedGradeSum / totalWeightWithGrades
    : null;

  const finalCompletionPercent = plans.reduce((sum, plan) => {
    const activeRAs = plan.ras.filter(r => r.active_t1 || r.active_t2 || r.active_t3);
    return sum + activeRAs.length;
  }, 0);

  const gradedRAs = raGrades.filter(r => r.grade !== null).length;
  const completionPercent = finalCompletionPercent > 0
    ? (gradedRAs / finalCompletionPercent) * 100
    : 0;

    return {
      studentId,
      studentName,
      studentFirstName: studentName,
      studentLastName,
      finalGrade,
      finalCompletionPercent: Math.round(completionPercent * 100) / 100,
    raGrades,
    trimesterGrades,
  };
}

/**
 * Compute RA and trimester grades for one student in one teaching plan.
 */
function computePlanStudentGrades(
  plan: TeachingPlanFull,
  studentScores: InstrumentScore[]
): {
  raGrades: StudentGradeSummary["raGrades"];
  trimesterGrades: StudentGradeSummary["trimesterGrades"];
} {
  const ras = plan.ras || [];
  const units = plan.units || [];
  const instruments = plan.instruments || [];

  // Build instrument → CE weight map for this plan
  const instrumentCEWeights = new Map<string, Map<string, number>>();
  for (const inst of instruments) {
    const ceWeightMap = new Map<string, number>();
    for (const cw of inst.ce_weights || []) {
      ceWeightMap.set(cw.plan_ce_id, Number(cw.weight) || 0);
    }
    instrumentCEWeights.set(inst.id, ceWeightMap);
  }

  // Build unit → trimester set map
  const unitTrimesters = new Map<string, Set<"T1" | "T2" | "T3">>();
  for (const unit of units) {
    const tris = new Set<"T1" | "T2" | "T3">();
    if (unit.active_t1) tris.add("T1");
    if (unit.active_t2) tris.add("T2");
    if (unit.active_t3) tris.add("T3");
    unitTrimesters.set(unit.id, tris);
  }

  // Build instrument → set of trimesters
  const instrumentTrimesters = new Map<string, Set<"T1" | "T2" | "T3">>();
  for (const inst of instruments) {
    const tris = new Set<"T1" | "T2" | "T3">();
    for (const uId of inst.unit_ids || []) {
      const unitTris = unitTrimesters.get(uId);
      if (unitTris) {
        for (const t of unitTris) tris.add(t);
      }
    }
    instrumentTrimesters.set(inst.id, tris);
  }

  // Build score lookup: key = instrument_id + ce_id
  const scoreMap = new Map<string, InstrumentScore>();
  for (const sc of studentScores) {
    const key = `${sc.instrument_id}_${sc.plan_ce_id || "null"}`;
    scoreMap.set(key, sc);
    if (sc.plan_ce_id) {
      scoreMap.set(`${sc.instrument_id}_${sc.plan_ce_id}`, sc);
    }
  }

  // Compute per-RA grades
  const raGrades: StudentGradeSummary["raGrades"] = [];

  for (const ra of ras) {
    const ces = ra.ces || [];
    const raWeight = Number(ra.weight_global) || 0;

    // Find instruments that cover this RA
    const coveringInstruments = instruments.filter(inst =>
      inst.ra_coverages?.some(rc => rc.plan_ra_id === ra.id)
    );

    if (coveringInstruments.length === 0) {
      raGrades.push({
        raId: ra.id,
        raCode: ra.code,
        grade: null,
        completionPercent: 0,
        weightInPlan: raWeight,
      });
      continue;
    }

    // Compute CE grades within this RA
    let raWeightedSum = 0;
    let raTotalCEWeight = 0;
    let cesGraded = 0;

    for (const ce of ces) {
      const ceWeight = Number(ce.weight_in_ra) || 0;

      // Sum all instrument scores for this CE
      let ceGradeSum = 0;
      let ceTotalWeight = 0;

      for (const inst of coveringInstruments) {
        const ceWeights = instrumentCEWeights.get(inst.id);
        const coverageFactor = ceWeights?.get(ce.id);
        if (!coverageFactor || coverageFactor <= 0) continue;

        // Look up score — try CE-specific first, then instrument-level
        const score = scoreMap.get(`${inst.id}_${ce.id}`)
          || scoreMap.get(`${inst.id}_null`);

        if (score && score.score_value !== null) {
          const factor = coverageFactor / 100;
          ceGradeSum += score.score_value * factor;
          ceTotalWeight += factor;
        }
      }

      const ceGrade = ceTotalWeight > 0 ? ceGradeSum / ceTotalWeight : null;

      if (ceGrade !== null && ceWeight > 0) {
        raWeightedSum += ceGrade * (ceWeight / 100);
        raTotalCEWeight += ceWeight / 100;
        cesGraded++;
      }
    }

    const raGrade = raTotalCEWeight > 0 ? raWeightedSum / raTotalCEWeight : null;
    const completionPercent = ces.length > 0 ? (cesGraded / ces.length) * 100 : 0;

    raGrades.push({
      raId: ra.id,
      raCode: ra.code,
      grade: raGrade,
      completionPercent: Math.round(completionPercent * 100) / 100,
      weightInPlan: raWeight,
    });
  }

  // Compute per-trimester grades (average of RA grades active in that trimester)
  const trimesterGrades: StudentGradeSummary["trimesterGrades"] = [];

  for (const triKey of ["T1", "T2", "T3"] as const) {
    const activeKey = triKey === "T1" ? "active_t1" : triKey === "T2" ? "active_t2" : "active_t3";

    const activeRAs = ras.filter(r => r[activeKey]);
    const activeRAGrades = raGrades.filter(rg => {
      const ra = ras.find(r => r.id === rg.raId);
      return ra && ra[activeKey] && rg.grade !== null;
    });

    const totalWeight = activeRAs.reduce((sum, r) => sum + (Number(r.weight_global) || 0), 0);
    const weightedSum = activeRAGrades.reduce((sum, rg) => {
      const ra = ras.find(r => r.id === rg.raId);
      return sum + ((rg.grade as number) || 0) * ((Number(ra?.weight_global) || 0) / 100);
    }, 0);

    const triGrade = totalWeight > 0 ? weightedSum / (totalWeight / 100) : null;

    // Count instruments active in this trimester
    const triInstruments = instruments.filter(inst => {
      const tris = instrumentTrimesters.get(inst.id);
      return tris?.has(triKey);
    });

    const gradedInstruments = triInstruments.filter(inst => {
      return studentScores.some(sc => sc.instrument_id === inst.id && sc.score_value !== null);
    });

    const completionPercent = triInstruments.length > 0
      ? (gradedInstruments.length / triInstruments.length) * 100
      : 0;

    trimesterGrades.push({
      key: triKey,
      grade: triGrade !== null ? Math.round(triGrade * 100) / 100 : null,
      completionPercent: Math.round(completionPercent * 100) / 100,
    });
  }

  return { raGrades, trimesterGrades };
}

function extractRAReferences(plans: TeachingPlanFull[]): RAReference[] {
  const map = new Map<string, RAReference>();
  for (const plan of plans) {
    for (const ra of plan.ras || []) {
      if (!map.has(ra.id)) {
        map.set(ra.id, { raId: ra.id, raCode: ra.code });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.raCode.localeCompare(b.raCode));
}

// ─────────────────────────────────────────────
// STATISTICAL HELPERS
// ─────────────────────────────────────────────

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function computeStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}
