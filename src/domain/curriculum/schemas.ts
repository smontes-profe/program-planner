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
  visibility_scope: z.enum(["private", "organization", "company"]).default("organization"),
});

/**
 * Validation schema for RA within a template
 */
export const templateRASchema = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid(),
  code: z.string().min(1).max(50),
  description: z.string().min(1),
  weight_in_template: z.coerce.number().min(0, "Mínimo 0").max(100, "Máximo 100"),
});

/**
 * Validation schema for CE within a template
 */
export const templateCESchema = z.object({
  id: z.string().uuid().optional(),
  template_ra_id: z.string().uuid(),
  code: z.string().min(1).max(50),
  description: z.string().min(1),
  weight_in_ra: z.coerce.number().min(0, "Mínimo 0").max(100, "Máximo 100"),
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

/**
 * Validation for percentage sums
 */
export function validateWeights(template: any): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (!template.ras || template.ras.length === 0) return { isValid: true, errors: [] };

  const totalRAWeight = template.ras.reduce((sum: number, ra: any) => sum + (ra.weight_in_template || 0), 0);
  
  // Use a small epsilon for floating point comparison if needed, 
  // but business requirement usually expects precise 100 (stored as numeric/decimal)
  if (totalRAWeight !== 100) {
    errors.push(`La suma de los pesos de los RA debe ser 100 (actual: ${totalRAWeight})`);
  }

  template.ras.forEach((ra: any, index: number) => {
    if (ra.ces && ra.ces.length > 0) {
      const totalCEWeight = ra.ces.reduce((sum: number, ce: any) => sum + (ce.weight_in_ra || 0), 0);
      if (totalCEWeight !== 100) {
        errors.push(`En RA [${ra.code || index + 1}], la suma de los pesos de los CE debe ser 100 (actual: ${totalCEWeight})`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
