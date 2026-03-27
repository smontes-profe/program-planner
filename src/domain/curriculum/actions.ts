"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { curriculumTemplateSchema, validateWeights } from "./schemas";
import { type CurriculumTemplate, type CurriculumStatus } from "./types";
import { z } from "zod";

/**
 * Result type for Server Actions
 */
type ActionResponse<T = any> = 
  | { ok: true; data: T } 
  | { ok: false; error: string; details?: any };

/**
 * Ensures the authenticated user can perform an action on a template
 */
async function authorizeAction(supabase: any, action: 'read' | 'write', organizationId: string, templateId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, error: "Usuario no autenticado", user: null };

  // Check organization membership
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("role_in_org")
    .eq("organization_id", organizationId)
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    // If no membership, check if platform admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .single();
    if (profile?.is_platform_admin) return { authorized: true, user };
    return { authorized: false, error: "No tienes permisos en esta organización", user };
  }

  // If write and teacher, check status or ownership
  if (action === 'write' && membership.role_in_org === 'teacher' && templateId) {
    const { data: template } = await supabase
      .from("curriculum_templates")
      .select("status, created_by_profile_id")
      .eq("id", templateId)
      .single();

    if (template?.status !== 'draft') return { authorized: false, error: "No se puede modificar un registro ya publicado.", user };
    if (template?.created_by_profile_id !== user.id) return { authorized: false, error: "Acceso denegado: No eres el creador de este borrador.", user };
  }

  return { authorized: true, user };
}

/**
 * Create a new Curriculum Template Draft
 */
export async function createTemplateDraft(payload: z.infer<typeof curriculumTemplateSchema>): Promise<ActionResponse<CurriculumTemplate>> {
  const validated = curriculumTemplateSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos del formulario inválidos", details: validated.error.flatten() };

  const supabase = await createClient();
  const { authorized, user, error } = await authorizeAction(supabase, 'write', validated.data.organization_id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

  const { data: template, error: dbError } = await supabase
    .from("curriculum_templates")
    .insert({
      ...validated.data,
      created_by_profile_id: user.id, // Ensure server-side ID
      status: 'draft' as CurriculumStatus,
    })
    .select()
    .single();

  if (dbError) return { ok: false, error: `Error en la base de datos: ${dbError.message}` };

  revalidatePath("/curriculum");
  return { ok: true, data: template };
}

/**
 * Update a Curriculum Template Draft
 */
export async function updateTemplateDraft(id: string, payload: Partial<z.infer<typeof curriculumTemplateSchema>>): Promise<ActionResponse<CurriculumTemplate>> {
  const supabase = await createClient();
  const { data: template } = await supabase.from("curriculum_templates").select("organization_id").eq("id", id).single();
  if (!template) return { ok: false, error: "Plantilla no encontrada" };

  const { authorized, error } = await authorizeAction(supabase, 'write', template.organization_id, id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

  const validated = curriculumTemplateSchema.partial().safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos del formulario inválidos", details: validated.error.flatten() };

  const { data: updated, error: dbError } = await supabase
    .from("curriculum_templates")
    .update(validated.data)
    .eq("id", id)
    .select()
    .single();

  if (dbError) return { ok: false, error: `Error en la base de datos: ${dbError.message}` };

  revalidatePath(`/curriculum/edit/${id}`);
  revalidatePath("/curriculum");
  return { ok: true, data: updated };
}

/**
 * Publish a Curriculum Template
 * Validates weights (RA sum = 100, CE sum per RA = 100)
 */
export async function publishTemplate(id: string): Promise<ActionResponse<CurriculumTemplate>> {
  const supabase = await createClient();
  
  // Fetch full template with RA/CE
  const { data: fullTemplate, error: fetchError } = await supabase
    .from("curriculum_templates")
    .select(`
      *,
      ras:template_ra (
        *,
        ces:template_ce (*)
      )
    `)
    .eq("id", id)
    .single();

  if (fetchError || !fullTemplate) return { ok: false, error: "Error al recuperar los datos de la plantilla" };

  // Authorization check
  const { authorized, error } = await authorizeAction(supabase, 'write', fullTemplate.organization_id, id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

  // Weight validation
  const validation = validateWeights(fullTemplate);
  if (!validation.isValid) {
    return { ok: false, error: "Validación de pesos fallida", details: validation.errors };
  }

  // Update status to published
  const { data: updated, error: dbError } = await supabase
    .from("curriculum_templates")
    .update({ status: 'published' as CurriculumStatus })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return { ok: false, error: `Error al publicar: ${dbError.message}` };

  revalidatePath(`/curriculum/edit/${id}`);
  revalidatePath("/curriculum");
  return { ok: true, data: updated };
}

/**
 * Delete a draft template
 */
export async function deleteTemplateDraft(id: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: template } = await supabase.from("curriculum_templates").select("organization_id, status").eq("id", id).single();
  if (!template) return { ok: false, error: "Plantilla no encontrada" };

  if (template.status !== 'draft') return { ok: false, error: "No se puede eliminar un registro ya publicado." };

  const { authorized, error } = await authorizeAction(supabase, 'write', template.organization_id, id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

  const { error: dbError } = await supabase.from("curriculum_templates").delete().eq("id", id);
  if (dbError) return { ok: false, error: `Error en la base de datos: ${dbError.message}` };

  revalidatePath("/curriculum");
  return { ok: true, data: null };
}

/**
 * List templates for a user based on their organization and visibility
 */
export async function listTemplates(): Promise<ActionResponse<CurriculumTemplate[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // Use the database RLS via the standard query
  const { data, error } = await supabase
    .from("curriculum_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as CurriculumTemplate[] };
}
