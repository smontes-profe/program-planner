import { z } from "zod";

const academicYearRegex = /^\d{4}\/\d{4}$/;

export const createPlanSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(255),
  source_template_id: z.string().uuid("Debes seleccionar un currículo base"),
  academic_year: z.string().regex(academicYearRegex, "Formato esperado: YYYY/YYYY"),
  visibility_scope: z.enum(["private", "organization", "company"]).default("private"),
});

export const updatePlanSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  visibility_scope: z.enum(["private", "organization", "company"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
  hours_total: z.coerce.number().min(1).optional(),
});

export const updatePlanRAConfigSchema = z.object({
  weight_global: z.number().min(0).max(100),
  active_t1: z.boolean(),
  active_t2: z.boolean(),
  active_t3: z.boolean(),
});

export const planRASchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().min(1),
});

export const planCESchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().min(1),
  weight_in_ra: z.number().min(0).max(100).default(0),
});

export const planTeachingUnitSchema = z.object({
  code: z.string().min(1, "El código es obligatorio"),
  title: z.string().min(1, "El título es obligatorio"),
  active_t1: z.boolean(),
  active_t2: z.boolean(),
  active_t3: z.boolean(),
  hours: z.coerce.number().min(0).default(0),
}).refine(data => data.active_t1 || data.active_t2 || data.active_t3, {
  message: "Debes seleccionar al menos un trimestre",
  path: ["active_t1"],
});

export const planInstrumentSchema = z.object({
  code: z.string().min(1, "El código es obligatorio"),
  type: z.enum(["exam", "practice", "project", "oral", "activity", "other"]),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional().nullable(),
});
