import { z } from "zod";

// ─── Evaluation Context ─────────────────────────────────────────────────────

export const createEvaluationContextSchema = z.object({
  title: z.string().min(1).max(255),
  organization_id: z.string().uuid(),
  academic_year: z.string().regex(/^\d{4}\/\d{4}$/, "Formato: YYYY/YYYY (ej. 2026/2027)"),
});

export const updateEvaluationContextSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  academic_year: z.string().regex(/^\d{4}\/\d{4}$/, "Formato: YYYY/YYYY (ej. 2026/2027)").optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
});

export const linkModuleToContextSchema = z.object({
  context_id: z.string().uuid(),
  teaching_plan_id: z.string().uuid(),
});

// ─── Evaluation Student ─────────────────────────────────────────────────────

export const createStudentSchema = z.object({
  student_name: z.string().min(1).max(255),
  last_name: z.string().max(255).nullable().optional(),
  student_code: z.string().max(50).nullable().optional(),
  student_email: z.string().email().nullable().optional(),
});

export const updateStudentSchema = createStudentSchema.extend({
  active: z.boolean().optional(),
});

export const bulkImportStudentsSchema = z.object({
  students: z.array(z.object({
    student_name: z.string().min(1),
    last_name: z.string().nullable().optional(),
    student_code: z.string().nullable().optional(),
    student_email: z.string().email().nullable().optional(),
  })),
});

// ─── Instrument Score ────────────────────────────────────────────────────────

export const upsertInstrumentScoreSchema = z.object({
  instrument_id: z.string().uuid(),
  student_id: z.string().uuid(),
  plan_ce_id: z.string().uuid().nullable().optional(),
  score_value: z.coerce.number().min(0).max(10).nullable(),
  score_date: z.string().date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// â”€â”€â”€ Trimester Locks + Manual Overrides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const updateTrimesterLockSchema = z.object({
  context_id: z.string().uuid(),
  trimester_key: z.enum(["T1", "T2", "T3"]),
  closed: z.boolean(),
});

export const upsertTrimesterAdjustedOverrideSchema = z.object({
  context_id: z.string().uuid(),
  student_id: z.string().uuid(),
  trimester_key: z.enum(["T1", "T2", "T3"]),
  // -1 es el valor especial "NE" (No evaluad@)
  adjusted_grade: z.coerce.number().refine(v => v === -1 || (v >= 0 && v <= 10), {
    message: "La nota debe estar entre 0 y 10, o ser -1 (NE)",
  }),
});

export const upsertRAManualOverrideSchema = z.object({
  context_id: z.string().uuid(),
  student_id: z.string().uuid(),
  plan_ra_id: z.string().uuid(),
  improved_grade: z.coerce.number().min(0).max(10),
});

export const upsertFinalManualOverrideSchema = z.object({
  context_id: z.string().uuid(),
  student_id: z.string().uuid(),
  improved_final_grade: z.coerce.number().min(0).max(10),
});
