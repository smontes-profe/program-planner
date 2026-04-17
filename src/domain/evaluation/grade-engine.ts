/**
 * Grade Engine for Evaluation Module
 *
 * Computes grades for students based on:
 * - Standard instruments (weighted RA/CE model)
 * - PRI/PMI instruments (RA replacement, latest score date wins)
 * - Manual overrides (RA improved + final improved + trimester adjusted)
 * - Trimester auto locks (frozen auto values from snapshots)
 */

import type {
  EvaluationContextFull,
  EvaluationFinalManualOverride,
  EvaluationRAManualOverride,
  EvaluationTrimesterAdjustedOverride,
  EvaluationTrimesterAutoSnapshot,
  EvaluationTrimesterLocks,
  InstrumentScore,
  RAReference,
  StudentGradeSummary,
  StudentRAGradeSummary,
  StudentTrimesterGradeSummary,
  TrimesterKey,
} from "./types";
import type { TeachingPlanFull, PlanInstrument, PlanRA, PlanCE } from "@/domain/teaching-plan/types";

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
  trimesterLocks: {
    T1: boolean;
    T2: boolean;
    T3: boolean;
  };
}

export interface GradeComputationOptions {
  trimesterLocks?: EvaluationTrimesterLocks | null;
  trimesterAutoSnapshots?: EvaluationTrimesterAutoSnapshot[];
  trimesterAdjustedOverrides?: EvaluationTrimesterAdjustedOverride[];
  raManualOverrides?: EvaluationRAManualOverride[];
  finalManualOverrides?: EvaluationFinalManualOverride[];
  ignoreTrimesterLocks?: boolean;
}

interface GradeAndCompletion {
  grade: number | null;
  completionPercent: number;
}

interface InstrumentIndexEntry {
  instrument: PlanInstrument;
  plan: TeachingPlanFull;
  trimesters: Set<TrimesterKey>;
}

interface StudentScoreLookup {
  scoreByInstrumentAndCE: Map<string, InstrumentScore>;
  fallbackByInstrument: Map<string, InstrumentScore>;
}

const TRIMESTERS: TrimesterKey[] = ["T1", "T2", "T3"];

/**
 * Compute grades for all students in an evaluation context.
 */
export function computeAllStudentGrades(
  context: EvaluationContextFull,
  plans: TeachingPlanFull[],
  scores: InstrumentScore[],
  options: GradeComputationOptions = {}
): GradeComputationResult {
  const students = context.students.filter(s => s.active);
  const instrumentIndex = buildInstrumentIndex(plans);

  const scoresByStudent = new Map<string, InstrumentScore[]>();
  for (const score of scores) {
    const arr = scoresByStudent.get(score.student_id) || [];
    arr.push(score);
    scoresByStudent.set(score.student_id, arr);
  }

  const trimesterAdjustedOverrideMap = new Map<string, number>();
  for (const override of options.trimesterAdjustedOverrides || []) {
    trimesterAdjustedOverrideMap.set(trimesterOverrideKey(override.student_id, override.trimester_key), Number(override.adjusted_grade));
  }

  const raManualOverrideMap = new Map<string, number>();
  for (const override of options.raManualOverrides || []) {
    raManualOverrideMap.set(raOverrideKey(override.student_id, override.plan_ra_id), Number(override.improved_grade));
  }

  const finalManualOverrideMap = new Map<string, number>();
  for (const override of options.finalManualOverrides || []) {
    finalManualOverrideMap.set(override.student_id, Number(override.improved_final_grade));
  }

  const trimesterSnapshotMap = new Map<string, EvaluationTrimesterAutoSnapshot>();
  for (const snapshot of options.trimesterAutoSnapshots || []) {
    trimesterSnapshotMap.set(trimesterOverrideKey(snapshot.student_id, snapshot.trimester_key), snapshot);
  }

  const trimesterLocks = {
    T1: options.ignoreTrimesterLocks ? false : Boolean(options.trimesterLocks?.t1_auto_closed),
    T2: options.ignoreTrimesterLocks ? false : Boolean(options.trimesterLocks?.t2_auto_closed),
    T3: options.ignoreTrimesterLocks ? false : Boolean(options.trimesterLocks?.t3_auto_closed),
  };

  const studentGrades = students.map(student => {
    const studentScores = scoresByStudent.get(student.id) || [];
    return computeSingleStudentGrade({
      studentId: student.id,
      studentName: student.student_name,
      studentLastName: student.last_name,
      studentScores,
      plans,
      instrumentIndex,
      trimesterLocks,
      trimesterAdjustedOverrideMap,
      raManualOverrideMap,
      finalManualOverrideMap,
      trimesterSnapshotMap,
    });
  });

  const finalGrades = studentGrades
    .map(s => s.finalImprovedGrade)
    .filter((g): g is number => g !== null);

  const groupStats = {
    averageFinalGrade: finalGrades.length > 0
      ? finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length
      : null,
    medianFinalGrade: computeMedian(finalGrades),
    stdDevFinalGrade: computeStdDev(finalGrades),
    totalStudents: students.length,
    gradedStudents: studentGrades.filter(s => s.finalImprovedGrade !== null).length,
  };

  const raReferences = extractRAReferences(plans);
  return { studentGrades, groupStats, raReferences, trimesterLocks };
}

interface ComputeSingleStudentGradeParams {
  studentId: string;
  studentName: string;
  studentLastName: string | null;
  studentScores: InstrumentScore[];
  plans: TeachingPlanFull[];
  instrumentIndex: Map<string, InstrumentIndexEntry>;
  trimesterLocks: GradeComputationResult["trimesterLocks"];
  trimesterAdjustedOverrideMap: Map<string, number>;
  raManualOverrideMap: Map<string, number>;
  finalManualOverrideMap: Map<string, number>;
  trimesterSnapshotMap: Map<string, EvaluationTrimesterAutoSnapshot>;
}

function computeSingleStudentGrade(params: ComputeSingleStudentGradeParams): StudentGradeSummary {
  const {
    studentId,
    studentName,
    studentLastName,
    studentScores,
    plans,
    instrumentIndex,
    trimesterLocks,
    trimesterAdjustedOverrideMap,
    raManualOverrideMap,
    finalManualOverrideMap,
    trimesterSnapshotMap,
  } = params;

  const scoreLookup = buildStudentScoreLookup(studentScores);

  const raGrades: StudentRAGradeSummary[] = [];
  for (const plan of plans) {
    for (const ra of plan.ras || []) {
      const standardCoveringInstruments = (plan.instruments || []).filter(inst =>
        !inst.is_pri_pmi && instrumentTouchesRA(inst, ra.id)
      );

      const original = computeRAGradeFromInstruments(ra, standardCoveringInstruments, scoreLookup);
      const priPmiImpacts = buildPriPmiImpactsForRA({
        plan,
        raId: ra.id,
        scoreLookup,
        originalGrade: original.grade,
      });
      const bestApplied = priPmiImpacts.find(i => i.isApplied);
      const improvedAutoGrade = bestApplied ? bestApplied.scoreValue : null;
      const manualOverride = raManualOverrideMap.get(raOverrideKey(studentId, ra.id));
      const improvedGrade = manualOverride ?? improvedAutoGrade ?? original.grade;
      const improvedIsManual = manualOverride !== undefined;
      const improvedCompletionPercent = improvedGrade === null
        ? original.completionPercent
        : 100;

      raGrades.push({
        raId: ra.id,
        raCode: ra.code,
        weightInPlan: Number(ra.weight_global) || 0,
        originalGrade: original.grade,
        originalCompletionPercent: original.completionPercent,
        originalHasMissingData: original.grade === null || original.completionPercent < 100,
        improvedAutoGrade,
        improvedGrade,
        improvedCompletionPercent,
        improvedHasMissingData: improvedGrade === null || improvedCompletionPercent < 100,
        improvedIsManual,
        priPmiImpacts,
      });
    }
  }

  const trimesterGrades = TRIMESTERS.map((trimesterKey) => {
    const auto = computeTrimesterAutoGrade({
      trimesterKey,
      plans,
      scoreLookup,
      instrumentIndex,
    });

    const snapshot = trimesterSnapshotMap.get(trimesterOverrideKey(studentId, trimesterKey));
    const autoIsLocked = trimesterLocks[trimesterKey];
    const autoGrade = autoIsLocked && snapshot ? normalizeNullableNumber(snapshot.auto_grade) : auto.grade;
    const autoCompletionPercent = autoIsLocked && snapshot
      ? normalizePercent(snapshot.completion_percent)
      : auto.completionPercent;
    const autoHasMissingData = autoGrade === null || autoCompletionPercent < 100;

    const adjustedOverride = trimesterAdjustedOverrideMap.get(trimesterOverrideKey(studentId, trimesterKey));
    const adjustedGrade = adjustedOverride ?? (autoGrade === null ? null : Math.floor(autoGrade));

    const summary: StudentTrimesterGradeSummary = {
      key: trimesterKey,
      autoGrade,
      autoCompletionPercent,
      autoHasMissingData,
      autoIsLocked,
      adjustedGrade: normalizeNullableNumber(adjustedGrade),
      adjustedIsManual: adjustedOverride !== undefined,
      adjustedHasMissingData: autoHasMissingData,
    };

    return summary;
  });

  const finalOriginal = computeWeightedGradeAndCompletion(
    raGrades.map(ra => ({
      grade: ra.originalGrade,
      completionPercent: ra.originalCompletionPercent,
      weight: ra.weightInPlan,
    }))
  );

  const finalImprovedAuto = computeWeightedGradeAndCompletion(
    raGrades.map(ra => ({
      grade: ra.improvedGrade,
      completionPercent: ra.improvedCompletionPercent,
      weight: ra.weightInPlan,
    }))
  );

  const finalManualOverride = finalManualOverrideMap.get(studentId);
  const finalImprovedGrade = finalManualOverride ?? finalImprovedAuto.grade;
  const finalImprovedIsManual = finalManualOverride !== undefined;
  const finalImprovedCompletionPercent = finalImprovedGrade === null
    ? finalImprovedAuto.completionPercent
    : 100;

  return {
    studentId,
    studentName,
    studentFirstName: studentName,
    studentLastName,
    finalGrade: normalizeNullableNumber(finalImprovedGrade),
    finalCompletionPercent: finalImprovedCompletionPercent,
    finalOriginalAutoGrade: finalOriginal.grade,
    finalOriginalCompletionPercent: finalOriginal.completionPercent,
    finalOriginalHasMissingData: finalOriginal.grade === null || finalOriginal.completionPercent < 100,
    finalImprovedAutoGrade: finalImprovedAuto.grade,
    finalImprovedGrade: normalizeNullableNumber(finalImprovedGrade),
    finalImprovedCompletionPercent,
    finalImprovedHasMissingData: finalImprovedGrade === null || finalImprovedCompletionPercent < 100,
    finalImprovedIsManual,
    raGrades,
    trimesterGrades,
  };
}

function computeTrimesterAutoGrade(params: {
  trimesterKey: TrimesterKey;
  plans: TeachingPlanFull[];
  scoreLookup: StudentScoreLookup;
  instrumentIndex: Map<string, InstrumentIndexEntry>;
}): GradeAndCompletion {
  const raEntries: Array<{ grade: number | null; completionPercent: number; weight: number }> = [];

  for (const plan of params.plans) {
    const planInstruments = plan.instruments || [];
    const trimesterInstruments = planInstruments.filter(inst =>
      !inst.is_pri_pmi && instrumentActiveInTrimester(inst.id, params.trimesterKey, params.instrumentIndex)
    );

    for (const ra of plan.ras || []) {
      if (!isRAActiveInTrimester(ra, params.trimesterKey)) continue;
      const coveringInstruments = trimesterInstruments.filter(inst => instrumentTouchesRA(inst, ra.id));
      const raGrade = computeRAGradeFromInstruments(ra, coveringInstruments, params.scoreLookup);
      raEntries.push({
        grade: raGrade.grade,
        completionPercent: raGrade.completionPercent,
        weight: Number(ra.weight_global) || 0,
      });
    }
  }

  return computeWeightedGradeAndCompletion(raEntries);
}

function computeRAGradeFromInstruments(
  ra: PlanRA,
  coveringInstruments: PlanInstrument[],
  scoreLookup: StudentScoreLookup
): GradeAndCompletion {
  const ces = ra.ces || [];

  if (coveringInstruments.length === 0 || ces.length === 0) {
    return { grade: null, completionPercent: 0 };
  }

  let raWeightedSum = 0;
  let raWeightSum = 0;
  let gradedCECount = 0;

  for (const ce of ces) {
    const ceWeight = Number(ce.weight_in_ra) || 0;
    const ceGrade = computeCEGradeFromInstruments(ce, coveringInstruments, scoreLookup);

    if (ceGrade !== null) {
      gradedCECount += 1;
      if (ceWeight > 0) {
        const ceWeightFactor = ceWeight / 100;
        raWeightedSum += ceGrade * ceWeightFactor;
        raWeightSum += ceWeightFactor;
      }
    }
  }

  const grade = raWeightSum > 0 ? raWeightedSum / raWeightSum : null;
  const completionPercent = ces.length > 0 ? (gradedCECount / ces.length) * 100 : 0;
  return {
    grade: normalizeNullableNumber(grade),
    completionPercent: normalizePercent(completionPercent),
  };
}

function computeCEGradeFromInstruments(
  ce: PlanCE,
  coveringInstruments: PlanInstrument[],
  scoreLookup: StudentScoreLookup
): number | null {
  let weightedSum = 0;
  let weightSum = 0;

  for (const inst of coveringInstruments) {
    const ceCoverage = (inst.ce_weights || []).find(cw => cw.plan_ce_id === ce.id);
    const coveragePercent = Number(ceCoverage?.weight) || 0;
    if (coveragePercent <= 0) continue;

    const specific = scoreLookup.scoreByInstrumentAndCE.get(scoreByInstrumentAndCEKey(inst.id, ce.id));
    const fallback = scoreLookup.fallbackByInstrument.get(inst.id);
    const score = specific || fallback;
    if (!score || score.score_value === null) continue;

    const coverageFactor = coveragePercent / 100;
    weightedSum += score.score_value * coverageFactor;
    weightSum += coverageFactor;
  }

  if (weightSum <= 0) return null;
  return weightedSum / weightSum;
}

function buildPriPmiImpactsForRA(params: {
  plan: TeachingPlanFull;
  raId: string;
  scoreLookup: StudentScoreLookup;
  originalGrade: number | null;
}): StudentRAGradeSummary["priPmiImpacts"] {
  const impacts = (params.plan.instruments || [])
    .filter(inst => inst.is_pri_pmi && instrumentTouchesRA(inst, params.raId))
    .map(inst => {
      const score = params.scoreLookup.fallbackByInstrument.get(inst.id);
      if (!score || score.score_value === null) return null;
      return {
        instrumentId: inst.id,
        instrumentCode: inst.code || inst.name,
        instrumentName: inst.name,
        scoreValue: normalizeNumber(score.score_value),
        scoreDate: resolveScoreDate(score),
        isApplied: false,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    // Ordenar por nota descendente: el mejor primero
    .sort((a, b) => b.scoreValue - a.scoreValue);

  // Solo marcar como aplicada la mejor nota si supera estrictamente la nota original
  if (
    impacts.length > 0 &&
    (params.originalGrade === null || impacts[0].scoreValue > params.originalGrade)
  ) {
    impacts[0] = { ...impacts[0], isApplied: true };
  }

  return impacts;
}

function computeWeightedGradeAndCompletion(
  entries: Array<{ grade: number | null; completionPercent: number; weight: number }>
): GradeAndCompletion {
  if (entries.length === 0) return { grade: null, completionPercent: 0 };

  const positiveWeightEntries = entries.filter(e => e.weight > 0);
  const hasWeights = positiveWeightEntries.length > 0;

  let weightedGradeSum = 0;
  let weightedGradeWeight = 0;
  let weightedCompletionSum = 0;
  let weightedCompletionWeight = 0;

  if (hasWeights) {
    for (const entry of positiveWeightEntries) {
      const weightFactor = entry.weight / 100;
      if (entry.grade !== null) {
        weightedGradeSum += entry.grade * weightFactor;
        weightedGradeWeight += weightFactor;
      }
      weightedCompletionSum += clamp(entry.completionPercent, 0, 100) * weightFactor;
      weightedCompletionWeight += weightFactor;
    }
  } else {
    for (const entry of entries) {
      if (entry.grade !== null) {
        weightedGradeSum += entry.grade;
        weightedGradeWeight += 1;
      }
      weightedCompletionSum += clamp(entry.completionPercent, 0, 100);
      weightedCompletionWeight += 1;
    }
  }

  return {
    grade: weightedGradeWeight > 0 ? normalizeNumber(weightedGradeSum / weightedGradeWeight) : null,
    completionPercent: weightedCompletionWeight > 0
      ? normalizePercent(weightedCompletionSum / weightedCompletionWeight)
      : 0,
  };
}

function buildInstrumentIndex(plans: TeachingPlanFull[]): Map<string, InstrumentIndexEntry> {
  const index = new Map<string, InstrumentIndexEntry>();

  for (const plan of plans) {
    const unitById = new Map((plan.units || []).map(unit => [unit.id, unit]));

    for (const instrument of plan.instruments || []) {
      const trimesters = new Set<TrimesterKey>();
      for (const unitId of instrument.unit_ids || []) {
        const unit = unitById.get(unitId);
        if (!unit) continue;
        if (unit.active_t1) trimesters.add("T1");
        if (unit.active_t2) trimesters.add("T2");
        if (unit.active_t3) trimesters.add("T3");
      }

      index.set(instrument.id, { instrument, plan, trimesters });
    }
  }

  return index;
}

function buildStudentScoreLookup(studentScores: InstrumentScore[]): StudentScoreLookup {
  const scoreByInstrumentAndCE = new Map<string, InstrumentScore>();
  const fallbackByInstrument = new Map<string, InstrumentScore>();

  for (const score of studentScores) {
    const planCE = score.plan_ce_id || null;
    scoreByInstrumentAndCE.set(scoreByInstrumentAndCEKey(score.instrument_id, planCE), score);

    const existingFallback = fallbackByInstrument.get(score.instrument_id);
    if (!existingFallback) {
      fallbackByInstrument.set(score.instrument_id, score);
      continue;
    }

    // Prefer generic (instrument-level) score as fallback. If not available, keep latest.
    if (existingFallback.plan_ce_id !== null && score.plan_ce_id === null) {
      fallbackByInstrument.set(score.instrument_id, score);
      continue;
    }
    if (existingFallback.plan_ce_id === null && score.plan_ce_id !== null) {
      continue;
    }

    if (parseDateToTimestamp(resolveScoreDate(score)) >= parseDateToTimestamp(resolveScoreDate(existingFallback))) {
      fallbackByInstrument.set(score.instrument_id, score);
    }
  }

  return { scoreByInstrumentAndCE, fallbackByInstrument };
}

function instrumentTouchesRA(instrument: PlanInstrument, raId: string): boolean {
  return Boolean(instrument.ra_coverages?.some(rc => rc.plan_ra_id === raId));
}

function isRAActiveInTrimester(ra: PlanRA, trimester: TrimesterKey): boolean {
  if (trimester === "T1") return Boolean(ra.active_t1);
  if (trimester === "T2") return Boolean(ra.active_t2);
  return Boolean(ra.active_t3);
}

function instrumentActiveInTrimester(
  instrumentId: string,
  trimester: TrimesterKey,
  instrumentIndex: Map<string, InstrumentIndexEntry>
): boolean {
  const meta = instrumentIndex.get(instrumentId);
  return meta?.trimesters.has(trimester) ?? false;
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

function resolveScoreDate(score: InstrumentScore): string | null {
  return score.score_date || score.updated_at || score.created_at || null;
}

function scoreByInstrumentAndCEKey(instrumentId: string, planCEId: string | null): string {
  return `${instrumentId}::${planCEId ?? "__instrument__"}`;
}

function trimesterOverrideKey(studentId: string, trimester: TrimesterKey): string {
  return `${studentId}::${trimester}`;
}

function raOverrideKey(studentId: string, raId: string): string {
  return `${studentId}::${raId}`;
}

function normalizeNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeNullableNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return normalizeNumber(value);
}

function normalizePercent(value: number): number {
  return normalizeNumber(clamp(value, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDateToTimestamp(value: string | null): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return normalizeNumber((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return normalizeNumber(sorted[mid]);
}

function computeStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return normalizeNumber(Math.sqrt(variance));
}
