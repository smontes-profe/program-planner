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
  student_email: z.string().email().nullable().optional(),
});

export const updateStudentSchema = createStudentSchema.extend({
  active: z.boolean().optional(),
});

export const bulkImportStudentsSchema = z.object({
  students: z.array(z.object({
    student_name: z.string().min(1),
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
