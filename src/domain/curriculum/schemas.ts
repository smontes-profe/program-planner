import { z } from "zod";

/**
 * Validates the academic_year format YYYY/YYYY (e.g., 2026/2027)
 */
const academicYearRegex = /^\d{4}\/\d{4}$/;

/**
 * Validation schema for Curriculum Template
 */
export const curriculumTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  created_by_profile_id: z.string().uuid().optional(),
  region_code: z.string().min(2).max(10), // e.g., 'AND', 'MAD'
  module_code: z.string().min(1).max(50),
  module_name: z.string().min(1).max(255),
  academic_year: z.string().regex(academicYearRegex, "Formato esperado: YYYY/YYYY (ej: 2026/2027)"),
  version: z.string().min(1).max(20),
  status: z.enum(["draft", "published", "deprecated"]).default("draft"),
  source_type: z.enum(["manual", "pdf_assisted"]).default("manual"),
  visibility_scope: z.enum(["private", "organization"]).default("organization"),
  hours_total: z.coerce.number().min(0).default(0),
  program_title: z.string().max(255).optional().nullable(),
  program_code: z.string().max(50).optional().nullable(),
  program_level: z.enum(["FP Básica", "Grado Medio", "Grado Superior", "Máster"]).optional().nullable(),
  program_course: z.enum(["Primero", "Segundo", "NA"]).optional().nullable(),
});

/**
 * Validation schema for RA within a template
 */
export const templateRASchema = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid(),
  code: z.string().min(1).max(50),
  description: z.string().min(1),
});

/**
 * Validation schema for CE within a template
 */
export const templateCESchema = z.object({
  id: z.string().uuid().optional(),
  template_ra_id: z.string().uuid(),
  code: z.string().min(1).max(50),
  description: z.string().min(1),
});

/**
 * Full template structure for creations or imports
 */
export const fullTemplateSchema = curriculumTemplateSchema.extend({
  ras: z.array(
    templateRASchema.extend({
      ces: z.array(templateCESchema),
    })
  ).optional(),
});
