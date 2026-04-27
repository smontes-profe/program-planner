/**
 * Tests del motor de notas (grade-engine.ts)
 *
 * Cubre los grupos T1-T9 definidos en docs/TASKS.md:
 *   T1 — Cálculo de RA originales
 *   T2 — Lógica PRI/PMI
 *   T3 — Overrides manuales
 *   T4 — Notas trimestrales
 *   T5 — Nota final del módulo
 *   T6 — Estadísticas de grupo
 *   T7 — Helpers de UI: parseo y formateo de notas
 *   T8 — Reglas de negocio de UI: validación de RA mejorada manual
 *   T9 — Reglas de negocio de UI: truncado de nota trimestral ajustada
 */

import { describe, it, expect } from "vitest";
import {
  computeAllStudentGrades,
} from "./grade-engine";
import type {
  InstrumentScore,
  EvaluationContextFull,
  EvaluationRAManualOverride,
  EvaluationFinalManualOverride,
  EvaluationTrimesterAdjustedOverride,
  EvaluationTrimesterAutoSnapshot,
  EvaluationTrimesterLocks,
} from "./types";
import type { TeachingPlanFull, PlanRA, PlanCE, PlanInstrument } from "@/domain/teaching-plan/types";

// ---------------------------------------------------------------------------
// Helpers de construcción de fixtures
// ---------------------------------------------------------------------------

let _idCounter = 0;
function uid(prefix = "id"): string {
  return `${prefix}-${++_idCounter}`;
}

function makeCE(overrides: Partial<PlanCE> & { id: string }): PlanCE {
  return {
    plan_ra_id: "ra-default",
    code: "a",
    description: "CE descripción",
    weight_in_ra: 100,
    order_index: 0,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRA(overrides: Partial<PlanRA> & { id: string; ces?: PlanCE[] }): PlanRA {
  return {
    plan_id: "plan-default",
    code: "1",
    description: "RA descripción",
    weight_global: 100,
    active_t1: true,
    active_t2: true,
    active_t3: true,
    order_index: 0,
    created_at: "2024-01-01T00:00:00Z",
    ces: [],
    ...overrides,
  };
}

function makeInstrument(
  overrides: Partial<PlanInstrument> & { id: string }
): PlanInstrument {
  return {
    plan_id: "plan-default",
    code: "I1",
    type: "exam",
    is_pri_pmi: false,
    ce_weight_auto: true,
    name: "Instrumento",
    description: null,
    created_at: "2024-01-01T00:00:00Z",
    unit_ids: [],
    ra_ids: [],
    ra_coverages: [],
    ce_weights: [],
    ...overrides,
  };
}

function makePlan(
  overrides: Partial<TeachingPlanFull> & { id: string; ras: PlanRA[] }
): TeachingPlanFull {
  return {
    organization_id: "org-1",
    owner_profile_id: "profile-1",
    source_plan_id: null,
    source_template_id: null,
    source_version: null,
    title: "Plan de prueba",
    region_code: "AND",
    module_code: "DAW01",
    academic_year: "2024/2025",
    visibility_scope: "private",
    status: "published",
    hours_total: 100,
    ce_weight_auto: false,
    imported_at: null,
    created_at: "2024-01-01T00:00:00Z",
    units: [],
    instruments: [],
    ...overrides,
  };
}

function makeContext(studentIds: string[]): EvaluationContextFull {
  return {
    id: "ctx-1",
    organization_id: "org-1",
    created_by_profile_id: "profile-1",
    academic_year: "2024/2025",
    title: "Contexto de prueba",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    plans: [],
    students: studentIds.map((id, i) => ({
      id,
      context_id: "ctx-1",
      student_code: `S${i + 1}`,
      last_name: `Apellido${i + 1}`,
      student_name: `Alumno${i + 1}`,
      student_email: null,
      active: true,
      notes: null,
      created_at: "2024-01-01T00:00:00Z",
    })),
  };
}

function makeScore(
  overrides: Partial<InstrumentScore> & {
    instrument_id: string;
    student_id: string;
    score_value: number | null;
  }
): InstrumentScore {
  return {
    id: uid("score"),
    context_id: "ctx-1",
    plan_ce_id: null,
    score_date: "2024-03-01",
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T1 — Motor de notas: cálculo de RA originales
// ---------------------------------------------------------------------------

describe("T1 — Cálculo de RA originales", () => {
  it("RA con un solo instrumento y un solo CE con peso 100%: nota RA = nota instrumento", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);
    const scores = [makeScore({ instrument_id: instId, student_id: studentId, score_value: 7 })];

    const result = computeAllStudentGrades(context, [plan], scores);
    const raGrade = result.studentGrades[0].raGrades[0];

    expect(raGrade.originalGrade).toBe(7);
  });

  it("RA con dos instrumentos y dos CEs, pesos iguales: nota RA = media de los dos instrumentos", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const inst1Id = uid("inst");
    const inst2Id = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: raId, weight_in_ra: 50 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: raId, weight_in_ra: 50 });
    const ra = makeRA({ id: raId, ces: [ce1, ce2], weight_global: 100 });

    const inst1 = makeInstrument({
      id: inst1Id,
      ra_coverages: [{ instrument_id: inst1Id, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst1Id, plan_ce_id: ce1Id, weight: 100 }],
    });
    const inst2 = makeInstrument({
      id: inst2Id,
      ra_coverages: [{ instrument_id: inst2Id, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst2Id, plan_ce_id: ce2Id, weight: 100 }],
    });

    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst1, inst2] });
    const context = makeContext([studentId]);
    const scores = [
      makeScore({ instrument_id: inst1Id, student_id: studentId, score_value: 6 }),
      makeScore({ instrument_id: inst2Id, student_id: studentId, score_value: 8 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    expect(result.studentGrades[0].raGrades[0].originalGrade).toBe(7);
  });

  it("RA con dos CEs y pesos distintos (30/70): la ponderación es correcta", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: raId, weight_in_ra: 30 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: raId, weight_in_ra: 70 });
    const ra = makeRA({ id: raId, ces: [ce1, ce2], weight_global: 100 });

    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [
        { instrument_id: instId, plan_ce_id: ce1Id, weight: 30 },
        { instrument_id: instId, plan_ce_id: ce2Id, weight: 70 },
      ],
    });

    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);
    // CE1 nota 10, CE2 nota 5 → esperado: (10*0.3 + 5*0.7) / (0.3+0.7) = (3+3.5)/1 = 6.5
    const scores = [
      makeScore({ instrument_id: instId, student_id: studentId, plan_ce_id: ce1Id, score_value: 10 }),
      makeScore({ instrument_id: instId, student_id: studentId, plan_ce_id: ce2Id, score_value: 5 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    expect(result.studentGrades[0].raGrades[0].originalGrade).toBe(6.5);
  });

  it("RA con CE sin nota de instrumento: originalGrade = null, completionPercent < 100", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);

    const result = computeAllStudentGrades(context, [plan], []);
    const raGrade = result.studentGrades[0].raGrades[0];

    expect(raGrade.originalGrade).toBeNull();
    expect(raGrade.originalCompletionPercent).toBeLessThan(100);
  });

  it("RA con todos los CEs sin nota: originalGrade = null, completionPercent = 0", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: raId, weight_in_ra: 50 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: raId, weight_in_ra: 50 });
    const ra = makeRA({ id: raId, ces: [ce1, ce2], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [
        { instrument_id: instId, plan_ce_id: ce1Id, weight: 50 },
        { instrument_id: instId, plan_ce_id: ce2Id, weight: 50 },
      ],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);

    const result = computeAllStudentGrades(context, [plan], []);
    const raGrade = result.studentGrades[0].raGrades[0];

    expect(raGrade.originalGrade).toBeNull();
    expect(raGrade.originalCompletionPercent).toBe(0);
  });

  it("RA con algún CE evaluado y otro no: completionPercent proporcional al número evaluado", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const inst1Id = uid("inst");
    const inst2Id = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: raId, weight_in_ra: 50 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: raId, weight_in_ra: 50 });
    const ra = makeRA({ id: raId, ces: [ce1, ce2], weight_global: 100 });
    // Instrumento 1 solo cubre CE1
    const inst1 = makeInstrument({
      id: inst1Id,
      ra_coverages: [{ instrument_id: inst1Id, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst1Id, plan_ce_id: ce1Id, weight: 100 }],
    });
    // Instrumento 2 solo cubre CE2 — sin score para este alumno
    const inst2 = makeInstrument({
      id: inst2Id,
      ra_coverages: [{ instrument_id: inst2Id, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst2Id, plan_ce_id: ce2Id, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst1, inst2] });
    const context = makeContext([studentId]);
    // Solo CE1 tiene nota (a través de inst1)
    const scores = [
      makeScore({ instrument_id: inst1Id, student_id: studentId, score_value: 8 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    const raGrade = result.studentGrades[0].raGrades[0];

    expect(raGrade.originalCompletionPercent).toBe(50);
  });

  it("Instrumento PRI/PMI no contribuye a originalGrade", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    // Instrumento marcado como PRI/PMI
    const inst = makeInstrument({
      id: instId,
      is_pri_pmi: true,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);
    const scores = [makeScore({ instrument_id: instId, student_id: studentId, score_value: 9 })];

    const result = computeAllStudentGrades(context, [plan], scores);
    const raGrade = result.studentGrades[0].raGrades[0];

    // PRI/PMI no debe contribuir a originalGrade
    expect(raGrade.originalGrade).toBeNull();
  });

  it("Score específico por CE tiene precedencia sobre score genérico de instrumento (fallback)", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);
    const scores = [
      // Score genérico (fallback) con nota 5
      makeScore({ instrument_id: instId, student_id: studentId, plan_ce_id: null, score_value: 5 }),
      // Score específico por CE con nota 9 — debe ganar
      makeScore({ instrument_id: instId, student_id: studentId, plan_ce_id: ceId, score_value: 9 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    expect(result.studentGrades[0].raGrades[0].originalGrade).toBe(9);
  });

  it("Instrumento activo en T1 no aparece en la nota de T2 (segregación trimestral)", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const unitId = uid("unit");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100, active_t1: true, active_t2: true });
    const inst = makeInstrument({
      id: instId,
      unit_ids: [unitId],
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({
      id: "plan-1",
      ras: [ra],
      instruments: [inst],
      units: [{
        id: unitId,
        plan_id: "plan-1",
        code: "UT1",
        title: "Unidad 1",
        active_t1: true,
        active_t2: false, // Solo T1
        active_t3: false,
        hours: 10,
        order_index: 0,
        created_at: "2024-01-01T00:00:00Z",
      }],
    });
    const context = makeContext([studentId]);
    const scores = [makeScore({ instrument_id: instId, student_id: studentId, score_value: 8 })];

    const result = computeAllStudentGrades(context, [plan], scores);
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");
    const t2 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T2");

    expect(t1?.autoGrade).not.toBeNull();
    expect(t2?.autoGrade).toBeNull();
  });

  it("RA inactivo en T2 no forma parte de la nota trimestral T2", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const unitId = uid("unit");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    // RA activo solo en T1
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100, active_t1: true, active_t2: false, active_t3: false });
    const inst = makeInstrument({
      id: instId,
      unit_ids: [unitId],
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({
      id: "plan-1",
      ras: [ra],
      instruments: [inst],
      units: [{
        id: unitId,
        plan_id: "plan-1",
        code: "UT1",
        title: "Unidad 1",
        active_t1: true,
        active_t2: true,
        active_t3: false,
        hours: 10,
        order_index: 0,
        created_at: "2024-01-01T00:00:00Z",
      }],
    });
    const context = makeContext([studentId]);
    const scores = [makeScore({ instrument_id: instId, student_id: studentId, score_value: 8 })];

    const result = computeAllStudentGrades(context, [plan], scores);
    const t2 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T2");

    expect(t2?.autoGrade).toBeNull();
  });
});

describe("T7 — formatAdjustedGradeValue", () => {
  it("formatAdjustedGradeValue(0): devuelve 'NE'", () => {
    expect(formatAdjustedGradeValue(0)).toBe("NE");
  });

  it("formatAdjustedGradeValue(-1): devuelve 'MH'", () => {
    expect(formatAdjustedGradeValue(-1)).toBe("MH");
  });

  it("formatAdjustedGradeValue(-8): devuelve 'PFEOE'", () => {
    expect(formatAdjustedGradeValue(-8)).toBe("PFEOE");
  });
});

describe("T7 — adjustedGradeValueToSelectValue", () => {
  it("adjustedGradeValueToSelectValue(null): devuelve ''", () => {
    expect(adjustedGradeValueToSelectValue(null)).toBe("");
  });

  it("adjustedGradeValueToSelectValue(0): devuelve '0'", () => {
    expect(adjustedGradeValueToSelectValue(0)).toBe("0");
  });
});

  it("Notas especiales no se incluyen en la media ni en el recuento de notas numéricas", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentIds = [uid("student"), uid("student"), uid("student")];

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-special", ras: [ra], instruments: [inst] });
    const context = makeContext(studentIds);
    const scoreRecords = studentIds.map(student_id =>
      makeScore({ instrument_id: instId, student_id, score_value: 8 })
    );
    const finalManualOverrides: EvaluationFinalManualOverride[] = [
      { context_id: "ctx-1", student_id: studentIds[0], improved_final_grade: 8, updated_by_profile_id: null, updated_at: "2024-01-01T00:00:00Z" },
      { context_id: "ctx-1", student_id: studentIds[1], improved_final_grade: 0, updated_by_profile_id: null, updated_at: "2024-01-01T00:00:00Z" },
      { context_id: "ctx-1", student_id: studentIds[2], improved_final_grade: -1, updated_by_profile_id: null, updated_at: "2024-01-01T00:00:00Z" },
    ];

    const result = computeAllStudentGrades(context, [plan], scoreRecords, { finalManualOverrides });

    expect(result.groupStats.averageFinalGrade).toBe(8);
    expect(result.groupStats.gradedStudents).toBe(1);
  });

// ---------------------------------------------------------------------------
// T2 — Motor de notas: lógica PRI/PMI
// ---------------------------------------------------------------------------

describe("T2 — Lógica PRI/PMI", () => {
  function setupPriPmiScenario(opts: {
    originalScore: number | null;
    priPmiScores: Array<{ score: number | null; date?: string }>;
  }) {
    const ceId = uid("ce");
    const stdInstId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });

    const stdInst = makeInstrument({
      id: stdInstId,
      is_pri_pmi: false,
      ra_coverages: [{ instrument_id: stdInstId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: stdInstId, plan_ce_id: ceId, weight: 100 }],
    });

    const priPmiInstruments: PlanInstrument[] = opts.priPmiScores.map((s, i) => {
      const id = uid("pmi");
      return makeInstrument({
        id,
        is_pri_pmi: true,
        ra_coverages: [{ instrument_id: id, plan_ra_id: raId, coverage_percent: 0 }],
        ce_weights: [],
      });
    });

    const plan = makePlan({
      id: "plan-1",
      ras: [ra],
      instruments: [stdInst, ...priPmiInstruments],
    });
    const context = makeContext([studentId]);

    const scores: InstrumentScore[] = [];
    if (opts.originalScore !== null) {
      scores.push(makeScore({ instrument_id: stdInstId, student_id: studentId, score_value: opts.originalScore }));
    }
    opts.priPmiScores.forEach((s, i) => {
      if (s.score !== null) {
        scores.push(makeScore({
          instrument_id: priPmiInstruments[i].id,
          student_id: studentId,
          score_value: s.score,
          score_date: s.date ?? "2024-03-01",
        }));
      }
    });

    return { plan, context, scores, raId, studentId };
  }

  it("Sin PRI/PMI para ese RA: improvedAutoGrade = null, improvedGrade = originalGrade", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 6,
      priPmiScores: [],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.improvedAutoGrade).toBeNull();
    expect(ra.improvedGrade).toBe(ra.originalGrade);
  });

  it("PRI/PMI con nota mayor que originalGrade: isApplied = true, improvedAutoGrade = scoreValue", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 5,
      priPmiScores: [{ score: 8 }],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.priPmiImpacts[0].isApplied).toBe(true);
    expect(ra.improvedAutoGrade).toBe(8);
  });

  it("PRI/PMI con nota igual a originalGrade: isApplied = false, no se aplica", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 7,
      priPmiScores: [{ score: 7 }],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.priPmiImpacts[0].isApplied).toBe(false);
    expect(ra.improvedAutoGrade).toBeNull();
    expect(ra.improvedGrade).toBe(7);
  });

  it("PRI/PMI con nota menor que originalGrade: isApplied = false, improvedGrade = originalGrade", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 8,
      priPmiScores: [{ score: 5 }],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.priPmiImpacts[0].isApplied).toBe(false);
    expect(ra.improvedGrade).toBe(8);
  });

  it("Varios PRI/PMI para el mismo RA: se selecciona el de mayor nota, no el más reciente", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 4,
      priPmiScores: [
        { score: 6, date: "2024-01-01" }, // más antiguo pero mayor nota
        { score: 9, date: "2024-06-01" }, // más reciente y mayor nota aún
        { score: 7, date: "2024-03-01" },
      ],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    // El de mayor nota (9) debe ser el aplicado
    const applied = ra.priPmiImpacts.find(i => i.isApplied);
    expect(applied?.scoreValue).toBe(9);
    expect(ra.improvedAutoGrade).toBe(9);
  });

  it("Varios PRI/PMI, el mejor no mejora la original: ninguno se marca isApplied", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 9,
      priPmiScores: [{ score: 7 }, { score: 8 }],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.priPmiImpacts.every(i => !i.isApplied)).toBe(true);
    expect(ra.improvedAutoGrade).toBeNull();
  });

  it("Varios PRI/PMI, el mejor sí mejora: solo el primero (mayor) tiene isApplied = true", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 5,
      priPmiScores: [{ score: 8 }, { score: 6 }],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    const appliedCount = ra.priPmiImpacts.filter(i => i.isApplied).length;
    expect(appliedCount).toBe(1);
    expect(ra.priPmiImpacts[0].isApplied).toBe(true);
    expect(ra.priPmiImpacts[0].scoreValue).toBe(8);
  });

  it("PRI/PMI sin nota registrada (score_value null): se ignora completamente", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: 5,
      priPmiScores: [{ score: null }],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.priPmiImpacts).toHaveLength(0);
    expect(ra.improvedAutoGrade).toBeNull();
  });

  it("originalGrade = null (RA sin evaluar): cualquier PRI/PMI con nota se marca isApplied = true", () => {
    const { plan, context, scores } = setupPriPmiScenario({
      originalScore: null,
      priPmiScores: [{ score: 6 }],
    });
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.originalGrade).toBeNull();
    expect(ra.priPmiImpacts[0].isApplied).toBe(true);
    expect(ra.improvedAutoGrade).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// T3 — Motor de notas: overrides manuales
// ---------------------------------------------------------------------------

describe("T3 — Overrides manuales", () => {
  function setupBasicPlan() {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);
    const scores = [makeScore({ instrument_id: instId, student_id: studentId, score_value: 6 })];

    return { plan, context, scores, raId, studentId };
  }

  it("Override manual de RA: improvedGrade = overrideValue, improvedIsManual = true", () => {
    const { plan, context, scores, raId, studentId } = setupBasicPlan();
    const raOverride: EvaluationRAManualOverride = {
      context_id: "ctx-1",
      student_id: studentId,
      plan_ra_id: raId,
      improved_grade: 9,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, { raManualOverrides: [raOverride] });
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.improvedGrade).toBe(9);
    expect(ra.improvedIsManual).toBe(true);
  });

  it("Override manual de RA con valor menor que improvedAutoGrade: el override prevalece igualmente", () => {
    const ceId = uid("ce");
    const stdInstId = uid("inst");
    const pmiInstId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const stdInst = makeInstrument({
      id: stdInstId,
      ra_coverages: [{ instrument_id: stdInstId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: stdInstId, plan_ce_id: ceId, weight: 100 }],
    });
    const pmiInst = makeInstrument({
      id: pmiInstId,
      is_pri_pmi: true,
      ra_coverages: [{ instrument_id: pmiInstId, plan_ra_id: raId, coverage_percent: 0 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [stdInst, pmiInst] });
    const context = makeContext([studentId]);
    const scores = [
      makeScore({ instrument_id: stdInstId, student_id: studentId, score_value: 5 }),
      makeScore({ instrument_id: pmiInstId, student_id: studentId, score_value: 9 }), // improvedAuto = 9
    ];
    const raOverride: EvaluationRAManualOverride = {
      context_id: "ctx-1",
      student_id: studentId,
      plan_ra_id: raId,
      improved_grade: 3, // menor que improvedAuto (9), pero debe prevalecer
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, { raManualOverrides: [raOverride] });
    const raGrade = result.studentGrades[0].raGrades[0];

    expect(raGrade.improvedGrade).toBe(3);
    expect(raGrade.improvedIsManual).toBe(true);
  });

  it("Sin override manual: improvedIsManual = false, improvedGrade = improvedAutoGrade ?? originalGrade", () => {
    const { plan, context, scores } = setupBasicPlan();
    const result = computeAllStudentGrades(context, [plan], scores);
    const ra = result.studentGrades[0].raGrades[0];

    expect(ra.improvedIsManual).toBe(false);
    expect(ra.improvedGrade).toBe(ra.improvedAutoGrade ?? ra.originalGrade);
  });

  it("Override manual de nota final: finalImprovedGrade = overrideValue, finalImprovedIsManual = true", () => {
    const { plan, context, scores, studentId } = setupBasicPlan();
    const finalOverride: EvaluationFinalManualOverride = {
      context_id: "ctx-1",
      student_id: studentId,
      improved_final_grade: 10,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, { finalManualOverrides: [finalOverride] });
    const student = result.studentGrades[0];

    expect(student.finalImprovedGrade).toBe(10);
    expect(student.finalImprovedIsManual).toBe(true);
  });

  it("Sin override final: nota final calculada desde RAs mejorados ponderados", () => {
    const { plan, context, scores } = setupBasicPlan();
    const result = computeAllStudentGrades(context, [plan], scores);
    const student = result.studentGrades[0];

    expect(student.finalImprovedIsManual).toBe(false);
    expect(student.finalImprovedGrade).toBe(student.finalImprovedAutoGrade);
  });

  it("Sin override final: la nota final ajustada redondea de forma normal", () => {
    const ra1Id = uid("ra");
    const ra2Id = uid("ra");
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const inst1Id = uid("inst");
    const inst2Id = uid("inst");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: ra1Id, weight_in_ra: 100 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: ra2Id, weight_in_ra: 100 });
    const ra1 = makeRA({ id: ra1Id, ces: [ce1], weight_global: 50 });
    const ra2 = makeRA({ id: ra2Id, ces: [ce2], weight_global: 50 });
    const inst1 = makeInstrument({
      id: inst1Id,
      ra_coverages: [{ instrument_id: inst1Id, plan_ra_id: ra1Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst1Id, plan_ce_id: ce1Id, weight: 100 }],
    });
    const inst2 = makeInstrument({
      id: inst2Id,
      ra_coverages: [{ instrument_id: inst2Id, plan_ra_id: ra2Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst2Id, plan_ce_id: ce2Id, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra1, ra2], instruments: [inst1, inst2] });
    const context = makeContext([studentId]);
    const scores = [
      makeScore({ instrument_id: inst1Id, student_id: studentId, score_value: 7.2 }),
      makeScore({ instrument_id: inst2Id, student_id: studentId, score_value: 8 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    const student = result.studentGrades[0];

    expect(student.finalImprovedAutoGrade).toBe(8);
    expect(student.finalImprovedGrade).toBe(8);
  });

  it("Override manual de nota final no afecta a finalOriginalAutoGrade", () => {
    const { plan, context, scores, studentId } = setupBasicPlan();
    const resultSin = computeAllStudentGrades(context, [plan], scores);
    const originalAutoGrade = resultSin.studentGrades[0].finalOriginalAutoGrade;

    const finalOverride: EvaluationFinalManualOverride = {
      context_id: "ctx-1",
      student_id: studentId,
      improved_final_grade: 10,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };
    const resultCon = computeAllStudentGrades(context, [plan], scores, { finalManualOverrides: [finalOverride] });

    expect(resultCon.studentGrades[0].finalOriginalAutoGrade).toBe(originalAutoGrade);
  });
});

// ---------------------------------------------------------------------------
// T4 — Motor de notas: notas trimestrales
// ---------------------------------------------------------------------------

describe("T4 — Notas trimestrales", () => {
  function setupTrimesterPlan() {
    const ceId = uid("ce");
    const instId = uid("inst");
    const unitId = uid("unit");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100, active_t1: true, active_t2: true });
    const inst = makeInstrument({
      id: instId,
      unit_ids: [unitId],
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({
      id: "plan-1",
      ras: [ra],
      instruments: [inst],
      units: [{
        id: unitId,
        plan_id: "plan-1",
        code: "UT1",
        title: "Unidad 1",
        active_t1: true,
        active_t2: false,
        active_t3: false,
        hours: 10,
        order_index: 0,
        created_at: "2024-01-01T00:00:00Z",
      }],
    });
    const context = makeContext([studentId]);

    return { plan, context, studentId };
  }

  it("Nota trimestral autocalculada sin notas: autoGrade = null", () => {
    const { plan, context } = setupTrimesterPlan();
    const result = computeAllStudentGrades(context, [plan], []);
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.autoGrade).toBeNull();
  });

  it("Nota trimestral es media ponderada de RAs activos en ese trimestre con notas", () => {
    const { plan, context, studentId } = setupTrimesterPlan();
    const scores = [makeScore({ instrument_id: plan.instruments![0].id, student_id: studentId, score_value: 7.5 })];
    const result = computeAllStudentGrades(context, [plan], scores);
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.autoGrade).toBe(7.5);
  });

  it("Override ajustado de trimestre: adjustedGrade = overrideValue, adjustedIsManual = true", () => {
    const { plan, context, studentId } = setupTrimesterPlan();
    const scores = [makeScore({ instrument_id: plan.instruments![0].id, student_id: studentId, score_value: 7.5 })];
    const override: EvaluationTrimesterAdjustedOverride = {
      context_id: "ctx-1",
      student_id: studentId,
      trimester_key: "T1",
      adjusted_grade: 8,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, { trimesterAdjustedOverrides: [override] });
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.adjustedGrade).toBe(8);
    expect(t1?.adjustedIsManual).toBe(true);
  });

  it("Override ajustado de trimestre con NE: adjustedGrade = 0 y no marca missing", () => {
    const { plan, context, studentId } = setupTrimesterPlan();
    const scores = [makeScore({ instrument_id: plan.instruments![0].id, student_id: studentId, score_value: 7.5 })];
    const override: EvaluationTrimesterAdjustedOverride = {
      context_id: "ctx-1",
      student_id: studentId,
      trimester_key: "T1",
      adjusted_grade: 0,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, { trimesterAdjustedOverrides: [override] });
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.adjustedGrade).toBe(0);
    expect(t1?.adjustedHasMissingData).toBe(false);
  });

  it("Sin override ajustado: adjustedGrade = floor(autoGrade)", () => {
    const { plan, context, studentId } = setupTrimesterPlan();
    const scores = [makeScore({ instrument_id: plan.instruments![0].id, student_id: studentId, score_value: 7.8 })];
    const result = computeAllStudentGrades(context, [plan], scores);
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.adjustedGrade).toBe(7);
  });

  it("autoGrade = null sin override: adjustedGrade = null", () => {
    const { plan, context } = setupTrimesterPlan();
    const result = computeAllStudentGrades(context, [plan], []);
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.autoGrade).toBeNull();
    expect(t1?.adjustedGrade).toBeNull();
  });

  it("Trimestre cerrado con snapshot: autoGrade toma el valor del snapshot (no recalcula)", () => {
    const { plan, context, studentId } = setupTrimesterPlan();
    const scores = [makeScore({ instrument_id: plan.instruments![0].id, student_id: studentId, score_value: 9 })];
    const snapshot: EvaluationTrimesterAutoSnapshot = {
      context_id: "ctx-1",
      student_id: studentId,
      trimester_key: "T1",
      auto_grade: 5, // snapshot antiguo con nota 5
      completion_percent: 100,
      captured_at: "2024-01-01T00:00:00Z",
    };
    const locks: EvaluationTrimesterLocks = {
      context_id: "ctx-1",
      t1_auto_closed: true,
      t2_auto_closed: false,
      t3_auto_closed: false,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, {
      trimesterLocks: locks,
      trimesterAutoSnapshots: [snapshot],
    });
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.autoGrade).toBe(5); // debe usar snapshot, no recalcular
    expect(t1?.autoIsLocked).toBe(true);
  });

  it("Trimestre cerrado sin snapshot: autoGrade recalcula igualmente (caso defensivo)", () => {
    const { plan, context, studentId } = setupTrimesterPlan();
    const scores = [makeScore({ instrument_id: plan.instruments![0].id, student_id: studentId, score_value: 8 })];
    const locks: EvaluationTrimesterLocks = {
      context_id: "ctx-1",
      t1_auto_closed: true,
      t2_auto_closed: false,
      t3_auto_closed: false,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, { trimesterLocks: locks });
    const t1 = result.studentGrades[0].trimesterGrades.find(t => t.key === "T1");

    expect(t1?.autoGrade).toBe(8); // recalcula porque no hay snapshot
    expect(t1?.autoIsLocked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T5 — Motor de notas: nota final del módulo
// ---------------------------------------------------------------------------

describe("T5 — Nota final del módulo", () => {
  it("Nota final original basada en originalGrade de RAs ponderados", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const inst1Id = uid("inst");
    const inst2Id = uid("inst");
    const ra1Id = uid("ra");
    const ra2Id = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: ra1Id, weight_in_ra: 100 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: ra2Id, weight_in_ra: 100 });
    const ra1 = makeRA({ id: ra1Id, ces: [ce1], weight_global: 40 });
    const ra2 = makeRA({ id: ra2Id, ces: [ce2], weight_global: 60 });
    const inst1 = makeInstrument({
      id: inst1Id,
      ra_coverages: [{ instrument_id: inst1Id, plan_ra_id: ra1Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst1Id, plan_ce_id: ce1Id, weight: 100 }],
    });
    const inst2 = makeInstrument({
      id: inst2Id,
      ra_coverages: [{ instrument_id: inst2Id, plan_ra_id: ra2Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst2Id, plan_ce_id: ce2Id, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra1, ra2], instruments: [inst1, inst2] });
    const context = makeContext([studentId]);
    const scores = [
      makeScore({ instrument_id: inst1Id, student_id: studentId, score_value: 5 }),
      makeScore({ instrument_id: inst2Id, student_id: studentId, score_value: 10 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    // Esperado: (5*0.4 + 10*0.6) / (0.4+0.6) = (2+6)/1 = 8
    expect(result.studentGrades[0].finalOriginalAutoGrade).toBe(8);
  });

  it("Nota final mejorada auto basada en improvedGrade de RAs ponderados", () => {
    const ceId = uid("ce");
    const stdInstId = uid("inst");
    const pmiInstId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const stdInst = makeInstrument({
      id: stdInstId,
      ra_coverages: [{ instrument_id: stdInstId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: stdInstId, plan_ce_id: ceId, weight: 100 }],
    });
    const pmiInst = makeInstrument({
      id: pmiInstId,
      is_pri_pmi: true,
      ra_coverages: [{ instrument_id: pmiInstId, plan_ra_id: raId, coverage_percent: 0 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [stdInst, pmiInst] });
    const context = makeContext([studentId]);
    const scores = [
      makeScore({ instrument_id: stdInstId, student_id: studentId, score_value: 5 }),
      makeScore({ instrument_id: pmiInstId, student_id: studentId, score_value: 9 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    expect(result.studentGrades[0].finalImprovedAutoGrade).toBe(9);
  });

  it("Con un RA sin nota y otro con nota: finalOriginalHasMissingData = true, grade parcial", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const inst1Id = uid("inst");
    const ra1Id = uid("ra");
    const ra2Id = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: ra1Id, weight_in_ra: 100 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: ra2Id, weight_in_ra: 100 });
    const ra1 = makeRA({ id: ra1Id, ces: [ce1], weight_global: 50 });
    const ra2 = makeRA({ id: ra2Id, ces: [ce2], weight_global: 50 });
    const inst1 = makeInstrument({
      id: inst1Id,
      ra_coverages: [{ instrument_id: inst1Id, plan_ra_id: ra1Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst1Id, plan_ce_id: ce1Id, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra1, ra2], instruments: [inst1] });
    const context = makeContext([studentId]);
    const scores = [makeScore({ instrument_id: inst1Id, student_id: studentId, score_value: 8 })];

    const result = computeAllStudentGrades(context, [plan], scores);
    expect(result.studentGrades[0].finalOriginalHasMissingData).toBe(true);
    expect(result.studentGrades[0].finalOriginalAutoGrade).not.toBeNull();
  });

  it("Todos los RAs sin nota: finalOriginalAutoGrade = null", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);

    const result = computeAllStudentGrades(context, [plan], []);
    expect(result.studentGrades[0].finalOriginalAutoGrade).toBeNull();
  });

  it("Pesos de RA suman 100%: la ponderación es correcta", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const inst1Id = uid("inst");
    const inst2Id = uid("inst");
    const ra1Id = uid("ra");
    const ra2Id = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: ra1Id, weight_in_ra: 100 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: ra2Id, weight_in_ra: 100 });
    const ra1 = makeRA({ id: ra1Id, ces: [ce1], weight_global: 30 });
    const ra2 = makeRA({ id: ra2Id, ces: [ce2], weight_global: 70 });
    const inst1 = makeInstrument({
      id: inst1Id,
      ra_coverages: [{ instrument_id: inst1Id, plan_ra_id: ra1Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst1Id, plan_ce_id: ce1Id, weight: 100 }],
    });
    const inst2 = makeInstrument({
      id: inst2Id,
      ra_coverages: [{ instrument_id: inst2Id, plan_ra_id: ra2Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst2Id, plan_ce_id: ce2Id, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra1, ra2], instruments: [inst1, inst2] });
    const context = makeContext([studentId]);
    const scores = [
      makeScore({ instrument_id: inst1Id, student_id: studentId, score_value: 10 }),
      makeScore({ instrument_id: inst2Id, student_id: studentId, score_value: 5 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    // Esperado: (10*0.3 + 5*0.7) / (0.3+0.7) = (3+3.5)/1 = 6.5
    expect(result.studentGrades[0].finalOriginalAutoGrade).toBe(6.5);
  });

  it("Pesos de RA a 0 (o inexistentes): se hace media simple igual", () => {
    const ce1Id = uid("ce");
    const ce2Id = uid("ce");
    const inst1Id = uid("inst");
    const inst2Id = uid("inst");
    const ra1Id = uid("ra");
    const ra2Id = uid("ra");
    const studentId = uid("student");

    const ce1 = makeCE({ id: ce1Id, plan_ra_id: ra1Id, weight_in_ra: 100 });
    const ce2 = makeCE({ id: ce2Id, plan_ra_id: ra2Id, weight_in_ra: 100 });
    const ra1 = makeRA({ id: ra1Id, ces: [ce1], weight_global: 0 });
    const ra2 = makeRA({ id: ra2Id, ces: [ce2], weight_global: 0 });
    const inst1 = makeInstrument({
      id: inst1Id,
      ra_coverages: [{ instrument_id: inst1Id, plan_ra_id: ra1Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst1Id, plan_ce_id: ce1Id, weight: 100 }],
    });
    const inst2 = makeInstrument({
      id: inst2Id,
      ra_coverages: [{ instrument_id: inst2Id, plan_ra_id: ra2Id, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: inst2Id, plan_ce_id: ce2Id, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra1, ra2], instruments: [inst1, inst2] });
    const context = makeContext([studentId]);
    const scores = [
      makeScore({ instrument_id: inst1Id, student_id: studentId, score_value: 6 }),
      makeScore({ instrument_id: inst2Id, student_id: studentId, score_value: 8 }),
    ];

    const result = computeAllStudentGrades(context, [plan], scores);
    // Media simple: (6+8)/2 = 7
    expect(result.studentGrades[0].finalOriginalAutoGrade).toBe(7);
  });

  it("Nota final mejorada manual prevalece sobre autocalculada", () => {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentId = uid("student");

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext([studentId]);
    const scores = [makeScore({ instrument_id: instId, student_id: studentId, score_value: 6 })];
    const finalOverride: EvaluationFinalManualOverride = {
      context_id: "ctx-1",
      student_id: studentId,
      improved_final_grade: 10,
      updated_by_profile_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = computeAllStudentGrades(context, [plan], scores, { finalManualOverrides: [finalOverride] });
    expect(result.studentGrades[0].finalImprovedGrade).toBe(10);
    expect(result.studentGrades[0].finalImprovedIsManual).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T6 — Motor de notas: estadísticas de grupo
// ---------------------------------------------------------------------------

describe("T6 — Estadísticas de grupo", () => {
  function setupMultiStudentPlan(studentCount: number, scores: number[]) {
    const ceId = uid("ce");
    const instId = uid("inst");
    const raId = uid("ra");
    const studentIds = Array.from({ length: studentCount }, () => uid("student"));

    const ce = makeCE({ id: ceId, plan_ra_id: raId, weight_in_ra: 100 });
    const ra = makeRA({ id: raId, ces: [ce], weight_global: 100 });
    const inst = makeInstrument({
      id: instId,
      ra_coverages: [{ instrument_id: instId, plan_ra_id: raId, coverage_percent: 100 }],
      ce_weights: [{ instrument_id: instId, plan_ce_id: ceId, weight: 100 }],
    });
    const plan = makePlan({ id: "plan-1", ras: [ra], instruments: [inst] });
    const context = makeContext(studentIds);
    const scoreRecords = studentIds.map((sid, i) =>
      makeScore({ instrument_id: instId, student_id: sid, score_value: scores[i] ?? null })
    );

    return { plan, context, scoreRecords };
  }

  it("Sin alumnos calificados: averageFinalGrade = null, medianFinalGrade = null", () => {
    const { plan, context } = setupMultiStudentPlan(3, []);
    const result = computeAllStudentGrades(context, [plan], []);

    expect(result.groupStats.averageFinalGrade).toBeNull();
    expect(result.groupStats.medianFinalGrade).toBeNull();
  });

  it("Un solo alumno calificado: averageFinalGrade = medianFinalGrade = stdDevFinalGrade = null", () => {
    const { plan, context, scoreRecords } = setupMultiStudentPlan(1, [7]);
    const result = computeAllStudentGrades(context, [plan], scoreRecords);

    expect(result.groupStats.averageFinalGrade).toBe(7);
    expect(result.groupStats.medianFinalGrade).toBe(7);
    expect(result.groupStats.stdDevFinalGrade).toBeNull(); // < 2 valores
  });

  it("Media con dos alumnos: valor correcto", () => {
    const { plan, context, scoreRecords } = setupMultiStudentPlan(2, [6, 8]);
    const result = computeAllStudentGrades(context, [plan], scoreRecords);

    expect(result.groupStats.averageFinalGrade).toBe(7);
  });

  it("Mediana con número impar de alumnos: elemento central", () => {
    const { plan, context, scoreRecords } = setupMultiStudentPlan(5, [3, 5, 7, 9, 10]);
    const result = computeAllStudentGrades(context, [plan], scoreRecords);

    expect(result.groupStats.medianFinalGrade).toBe(7);
  });

  it("Mediana con número par de alumnos: media de los dos centrales", () => {
    const { plan, context, scoreRecords } = setupMultiStudentPlan(4, [4, 6, 8, 10]);
    const result = computeAllStudentGrades(context, [plan], scoreRecords);

    // Centrales: 6 y 8 → (6+8)/2 = 7
    expect(result.groupStats.medianFinalGrade).toBe(7);
  });

  it("Desviación típica con valores iguales: stdDev = 0", () => {
    const { plan, context, scoreRecords } = setupMultiStudentPlan(3, [7, 7, 7]);
    const result = computeAllStudentGrades(context, [plan], scoreRecords);

    expect(result.groupStats.stdDevFinalGrade).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// T7 — Helpers de UI: parseo y formateo de notas
// ---------------------------------------------------------------------------

import { parseGrade, formatInputValue } from "./grade-ui-helpers";
import {
  adjustedGradeValueToSelectValue,
  formatAdjustedGradeValue,
  parseAdjustedGradeValue,
} from "./grade-values";

describe("T7 — parseGrade", () => {
  it('parseGrade(""): ok = false', () => {
    expect(parseGrade("").ok).toBe(false);
  });

  it('parseGrade("abc"): ok = false', () => {
    expect(parseGrade("abc").ok).toBe(false);
  });

  it('parseGrade("5,5"): ok = true, value = 5.5 (coma como decimal)', () => {
    const result = parseGrade("5,5");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(5.5);
  });

  it('parseGrade("-1"): ok = false (fuera de rango)', () => {
    expect(parseGrade("-1").ok).toBe(false);
  });

  it('parseGrade("10.5"): ok = false (fuera de rango)', () => {
    expect(parseGrade("10.5").ok).toBe(false);
  });

  it('parseGrade("7.5"): ok = true, value = 7.5', () => {
    const result = parseGrade("7.5");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(7.5);
  });
});

describe("T7 — parseAdjustedGradeValue", () => {
  it('parseAdjustedGradeValue("7"): ok = true, value = 7', () => {
    const result = parseAdjustedGradeValue("7");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(7);
  });

  it('parseAdjustedGradeValue("0"): ok = true, value = 0 (NE)', () => {
    const result = parseAdjustedGradeValue("0");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(0);
  });

  it('parseAdjustedGradeValue("-1"): ok = true, value = -1 (MH)', () => {
    const result = parseAdjustedGradeValue("-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(-1);
  });

  it('parseAdjustedGradeValue("7.3"): ok = false (decimal rechazado)', () => {
    expect(parseAdjustedGradeValue("7.3").ok).toBe(false);
  });
});

describe("T7 — formatInputValue", () => {
  it("formatInputValue(null): devuelve ''", () => {
    expect(formatInputValue(null)).toBe("");
  });

  it("formatInputValue(7): devuelve '7' (sin decimales para enteros)", () => {
    expect(formatInputValue(7)).toBe("7");
  });

  it("formatInputValue(7.5): devuelve '7.5'", () => {
    expect(formatInputValue(7.5)).toBe("7.5");
  });
});

// ---------------------------------------------------------------------------
// T8 — Reglas de negocio de UI: validación de RA mejorada manual
// ---------------------------------------------------------------------------

describe("T8 — Validación de RA mejorada manual", () => {
  /**
   * Estas reglas viven en la lógica de UI de GradesTab (saveRAImproved).
   * Las testeamos aquí como lógica pura extraída de la función.
   *
   * Regla: si el valor ingresado es >= improvedAutoGrade (o >= originalGrade cuando no hay PRI/PMI),
   * se acepta como override. Si es menor, se debe llamar a resetRAImproved.
   */

  function shouldAcceptOrReset(opts: {
    inputValue: number;
    originalGrade: number | null;
    improvedAutoGrade: number | null;
  }): "accept" | "reset" {
    const threshold = opts.improvedAutoGrade ?? opts.originalGrade;
    if (threshold === null) return "accept";
    if (opts.inputValue >= threshold) return "accept";
    return "reset";
  }

  it("Valor ingresado >= improvedAutoGrade: se acepta", () => {
    expect(shouldAcceptOrReset({ inputValue: 9, originalGrade: 5, improvedAutoGrade: 8 })).toBe("accept");
  });

  it("Valor ingresado < improvedAutoGrade (cuando hay PRI/PMI aplicado): se llama resetRAImproved", () => {
    expect(shouldAcceptOrReset({ inputValue: 6, originalGrade: 5, improvedAutoGrade: 8 })).toBe("reset");
  });

  it("Valor ingresado < originalGrade (cuando no hay PRI/PMI): se llama resetRAImproved", () => {
    expect(shouldAcceptOrReset({ inputValue: 3, originalGrade: 6, improvedAutoGrade: null })).toBe("reset");
  });

  it("Valor ingresado igual a originalGrade sin PRI/PMI: se acepta (es un override válido)", () => {
    expect(shouldAcceptOrReset({ inputValue: 6, originalGrade: 6, improvedAutoGrade: null })).toBe("accept");
  });
});

// ---------------------------------------------------------------------------
// T9 — Reglas de negocio de UI: truncado de nota trimestral ajustada
// ---------------------------------------------------------------------------

describe("T9 — Truncado de nota trimestral ajustada", () => {
  /**
   * El selector de notas ajustadas solo acepta valores del catálogo permitido.
   */

  function processTrimesterInput(raw: string) {
    return parseAdjustedGradeValue(raw);
  }

  it("Valor 7 ingresado: se guarda 7", () => {
    const result = processTrimesterInput("7");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(7);
  });

  it("Valor 0 ingresado: se guarda 0 y se muestra como NE", () => {
    const result = processTrimesterInput("0");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(0);
  });

  it("Valor -1 ingresado: se guarda -1 y se muestra como MH", () => {
    const result = processTrimesterInput("-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(-1);
  });

  it("Valor 7.9 ingresado: error de formato, no se guarda", () => {
    expect(processTrimesterInput("7.9").ok).toBe(false);
  });

  it("Valor 11 ingresado: error de rango, no se guarda", () => {
    expect(processTrimesterInput("11").ok).toBe(false);
  });
});
