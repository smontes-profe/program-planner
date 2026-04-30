"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { curriculumTemplateSchema } from "./schemas";
import { type CurriculumTemplate, type CurriculumStatus } from "./types";
import { z } from "zod";

/**
 * Result type for Server Actions
 */
export type ActionResponse<T = any> = 
  | { ok: true; data: T } 
  | { ok: false; error: string; details?: any; fields?: any };

async function getCurrentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function enrichTemplateMetadata<T extends { created_by_profile_id: string }>(
  templates: T[],
  currentUserId: string
): Promise<(T & { creator_name?: string | null; is_owner: boolean; can_edit: boolean })[]> {
  if (templates.length === 0) return [];

  return templates.map((template) => {
    const isOwner = template.created_by_profile_id === currentUserId;
    return {
      ...template,
      creator_name: isOwner ? "Tú" : "Otro creador",
      is_owner: isOwner,
      can_edit: isOwner,
    };
  });
}

/**
 * Ensures the authenticated user can perform an action on a template
 */
async function authorizeAction(supabase: any, action: 'read' | 'write', organizationId: string, templateId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, error: "Usuario no autenticado", user: null };

  let templateVisibility: { visibility_scope?: string; created_by_profile_id?: string; status?: string } | null = null;
  if (templateId) {
    const { data: template } = await supabase
      .from("curriculum_templates")
      .select("visibility_scope, created_by_profile_id, status")
      .eq("id", templateId)
      .single();

    templateVisibility = template ?? null;
    const isPrivate = templateVisibility?.visibility_scope === "private";
    const isOrgDraft = templateVisibility?.visibility_scope === "organization" && templateVisibility?.status === "draft";
    if (isPrivate || isOrgDraft) {
      if (templateVisibility?.created_by_profile_id !== user.id) {
        return { authorized: false, error: "Acceso denegado: este contenido solo lo puede usar su creador.", user };
      }
      return { authorized: true, user };
    }
  }

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

  if (action === 'write' && templateId) {
    if (templateVisibility?.created_by_profile_id !== user.id) {
      return { authorized: false, error: "Acceso denegado: este currículo solo lo puede editar su creador.", user };
    }
  }

  return { authorized: true, user };
}

/**
 * Server Action for useActionState (Form Submission)
 */
export async function createTemplateDraftAction(prevState: any, formData: FormData): Promise<ActionResponse<CurriculumTemplate>> {
  const rawData = Object.fromEntries(formData.entries());
  
  const validated = curriculumTemplateSchema.safeParse(rawData);
  if (!validated.success) {
    return { 
      ok: false, 
      error: "Datos del formulario inválidos", 
      details: validated.error.flatten().fieldErrors,
      fields: rawData
    };
  }

  const result = await createTemplateDraft(validated.data);
  if (!result.ok) {
    return { ...result, fields: rawData };
  }
  return result;
}

/**
 * Server Action for updating a template (Form Submission)
 */
export async function updateTemplateDraftAction(
  templateId: string,
  prevState: any, 
  formData: FormData
): Promise<ActionResponse<CurriculumTemplate>> {
  const rawData = Object.fromEntries(formData.entries());
  
  const validated = curriculumTemplateSchema.partial().safeParse(rawData);
  if (!validated.success) {
    return { 
      ok: false, 
      error: "Datos del formulario inválidos", 
      details: validated.error.flatten().fieldErrors,
      fields: rawData
    };
  }

  const result = await updateTemplateDraft(templateId, validated.data);
  if (!result.ok) {
    return { ...result, fields: rawData };
  }
  return result;
}

export async function addRA(templateId: string, payload: { code: string; description: string }): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_ra")
    .insert({
      template_id: templateId,
      code: payload.code,
      description: payload.description,
    });

  if (error) return { ok: false, error: `Error al añadir RA: ${error.message}`, fields: payload };
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * Add a Criteri d'Avaluació (CE) to an RA
 */
export async function addCE(templateId: string, raId: string, payload: { code: string; description: string }): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_ce")
    .insert({
      template_ra_id: raId,
      code: payload.code,
      description: payload.description,
    });

  if (error) return { ok: false, error: `Error al añadir CE: ${error.message}`, fields: payload };
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * Add multiple Criteris d'Avaluació (CE) to an RA
 */
export async function addMultipleCE(templateId: string, raId: string, payloads: { code: string; description: string }[]): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  
  const items = payloads.map(payload => ({
    template_ra_id: raId,
    code: payload.code,
    description: payload.description,
  }));

  const { error } = await supabase
    .from("template_ce")
    .insert(items);

  if (error) return { ok: false, error: `Error al añadir múltiples CE: ${error.message}` };
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * Add multiple RAs along with their nested CEs
 */
export async function addMultipleRAWithCE(
  templateId: string, 
  payloads: { code: string; description: string; ces: { code: string; description: string }[] }[]
): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  
  for (const payload of payloads) {
    // Insert RA
    const { data: raData, error: raError } = await supabase
      .from("template_ra")
      .insert({
        template_id: templateId,
        code: payload.code,
        description: payload.description,
      })
      .select("id")
      .single();

    if (raError || !raData) {
      return { ok: false, error: `Error al añadir RA ${payload.code}: ${raError?.message}` };
    }

    // Insert CEs for this RA
    if (payload.ces.length > 0) {
      const ceInserts = payload.ces.map(ce => ({
        template_ra_id: raData.id,
        code: ce.code,
        description: ce.description,
      }));

      const { error: ceError } = await supabase.from("template_ce").insert(ceInserts);
      if (ceError) {
        return { ok: false, error: `Error al añadir CEs para RA ${payload.code}: ${ceError.message}` };
      }
    }
  }

  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * Update the status of a Curriculum Template
 */
async function updateTemplateStatus(id: string, status: CurriculumStatus): Promise<ActionResponse<CurriculumTemplate>> {
  const supabase = await createClient();
  const { data: template } = await supabase.from("curriculum_templates").select("organization_id").eq("id", id).single();
  if (!template) return { ok: false, error: "Plantilla no encontrada" };

  const { authorized, error } = await authorizeAction(supabase, 'write', template.organization_id, id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

  const { data: updated, error: dbError } = await supabase
    .from("curriculum_templates")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return { ok: false, error: `Error al actualizar el estado: ${dbError.message}` };

  revalidatePath(`/curriculum/edit/${id}`);
  revalidatePath("/curriculum");
  return { ok: true, data: updated };
}

/**
 * Publish a template
 */
export async function publishTemplateAction(templateId: string): Promise<ActionResponse<any>> {
  return updateTemplateStatus(templateId, 'published');
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
  const { data: template } = await supabase
    .from("curriculum_templates")
    .select("organization_id, is_clone")
    .eq("id", id)
    .single();
  if (!template) return { ok: false, error: "Plantilla no encontrada" };

  const { authorized, error } = await authorizeAction(supabase, 'write', template.organization_id, id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

  const validated = curriculumTemplateSchema.partial().safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos del formulario inválidos", details: validated.error.flatten() };
  if (template.is_clone && validated.data.visibility_scope === "organization") {
    return {
      ok: false,
      error: "Los currículos clonados no se pueden hacer públicos.",
      fields: { ...payload, visibility_scope: "private" },
    };
  }

  const updatePayload = template.is_clone
    ? { ...validated.data, visibility_scope: "private" as const }
    : validated.data;

  const { data: updated, error: dbError } = await supabase
    .from("curriculum_templates")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (dbError) return { ok: false, error: `Error en la base de datos: ${dbError.message}` };

  revalidatePath(`/curriculum/edit/${id}`);
  revalidatePath("/curriculum");
  return { ok: true, data: updated };
}

/**
 * Clone a visible published organization curriculum into a private copy owned by the current user.
 */
export async function cloneCurriculumTemplate(sourceTemplateId: string): Promise<ActionResponse<CurriculumTemplate>> {
  const parsed = z.string().uuid().safeParse(sourceTemplateId);
  if (!parsed.success) return { ok: false, error: "Currículo no válido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  const { data: source, error: sourceError } = await supabase
    .from("curriculum_templates")
    .select(`
      *,
      ras:template_ra (
        *,
        ces:template_ce (*)
      )
    `)
    .eq("id", parsed.data)
    .single();

  if (sourceError || !source) {
    return { ok: false, error: "No se ha encontrado el currículo de origen" };
  }
  if (source.created_by_profile_id === user.id) {
    return { ok: false, error: "Este currículo ya es tuyo." };
  }
  if (source.status !== "published" || source.visibility_scope !== "organization") {
    return { ok: false, error: "Solo se pueden importar currículos públicos publicados." };
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("organization_id", source.organization_id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    return { ok: false, error: "No tienes acceso para importar este currículo." };
  }

  const cloneVersion = `clon-${Date.now().toString(36).slice(-8)}`;
  const { data: clone, error: cloneError } = await supabase
    .from("curriculum_templates")
    .insert({
      organization_id: source.organization_id,
      created_by_profile_id: user.id,
      source_template_id: source.id,
      is_clone: true,
      region_code: source.region_code,
      module_code: source.module_code,
      module_name: source.module_name,
      academic_year: source.academic_year,
      version: cloneVersion,
      status: "published",
      source_type: source.source_type,
      visibility_scope: "private",
      hours_total: source.hours_total || 0,
      program_title: source.program_title,
      program_code: source.program_code,
      program_level: source.program_level,
      program_course: source.program_course,
    })
    .select()
    .single();

  if (cloneError || !clone) {
    return { ok: false, error: `Error al clonar el currículo: ${cloneError?.message}` };
  }

  const cleanupClone = async () => {
    await supabase
      .from("curriculum_templates")
      .delete()
      .eq("id", clone.id)
      .eq("created_by_profile_id", user.id);
  };

  for (const ra of source.ras ?? []) {
    const { data: clonedRa, error: raError } = await supabase
      .from("template_ra")
      .insert({
        template_id: clone.id,
        code: ra.code,
        description: ra.description,
        weight_in_template: ra.weight_in_template ?? 0,
        order_index: ra.order_index ?? 0,
      })
      .select("id")
      .single();

    if (raError || !clonedRa) {
      await cleanupClone();
      return { ok: false, error: `Error al copiar el RA ${ra.code}: ${raError?.message}` };
    }

    const ceRows = (ra.ces ?? []).map((ce: {
      code: string;
      description: string;
      weight_in_ra?: number | null;
      order_index?: number | null;
    }) => ({
      template_ra_id: clonedRa.id,
      code: ce.code,
      description: ce.description,
      weight_in_ra: ce.weight_in_ra ?? 0,
      order_index: ce.order_index ?? 0,
    }));

    if (ceRows.length > 0) {
      const { error: ceError } = await supabase.from("template_ce").insert(ceRows);
      if (ceError) {
        await cleanupClone();
        return { ok: false, error: `Error al copiar los CE del RA ${ra.code}: ${ceError.message}` };
      }
    }
  }

  revalidatePath("/curriculum");
  revalidatePath(`/curriculum/${source.id}`);
  revalidatePath(`/curriculum/${clone.id}`);

  return { ok: true, data: clone as CurriculumTemplate };
}

/**
 * Publish a Curriculum Template
 */
export async function publishTemplate(id: string): Promise<ActionResponse<CurriculumTemplate>> {
  const supabase = await createClient();
  
  // Fetch template basic info for auth
  const { data: template, error: fetchError } = await supabase
    .from("curriculum_templates")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (fetchError || !template) return { ok: false, error: "Error al recuperar los datos de la plantilla" };

  // Authorization check
  const { authorized, error } = await authorizeAction(supabase, 'write', template.organization_id, id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

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
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: template } = await supabase.from("curriculum_templates").select("organization_id").eq("id", id).single();
  if (!template) return { ok: false, error: "Plantilla no encontrada" };

  const { authorized, error } = await authorizeAction(supabase, 'write', template.organization_id, id);
  if (!authorized) return { ok: false, error: error || "Sin autorización" };

  // Check if any plan is directly using this template
  const { count, error: countError } = await supabase
    .from("teaching_plans")
    .select("*", { count: "exact", head: true })
    .eq("source_template_id", id);

  if (countError) return { ok: false, error: "Error al verificar dependencias del currículo" };
  if (count && count > 0) return { ok: false, error: "No se puede eliminar: Hay programaciones vinculadas directamente a este currículo." };

  const { error: dbError } = await supabase.from("curriculum_templates").delete().eq("id", id);
  if (dbError) return { ok: false, error: `Error en la base de datos: ${dbError.message}` };

  revalidatePath("/curriculum");
  return { ok: true, data: null };
}

/**
 * Archive a curriculum template if it has no associated teaching plans
 */
export async function archiveTemplate(templateId: string): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  
  // Check if template exists and user has permission
  const { data: template, error: templateError } = await supabase
    .from("curriculum_templates")
    .select("id, organization_id, created_by_profile_id")
    .eq("id", templateId)
    .single();
    
  if (templateError || !template) {
    return { ok: false, error: "Currículo no encontrado" };
  }
  
  // Check user permissions
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || template.created_by_profile_id !== user.id) {
    return { ok: false, error: "No tienes permiso para archivar este currículo" };
  }
  
  // Check if there are any teaching plans using this template
  const { data: plans, error: plansError } = await supabase
    .from("teaching_plans")
    .select("id")
    .eq("source_template_id", templateId)
    .limit(1);
    
  if (plansError) {
    return { ok: false, error: "Error al verificar programaciones asociadas" };
  }
  
  if (plans && plans.length > 0) {
    return { ok: false, error: "No se puede archivar un currículo que tiene programaciones asociadas" };
  }
  
  // Archive the template
  const { error: archiveError } = await supabase
    .from("curriculum_templates")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", templateId);
    
  if (archiveError) {
    return { ok: false, error: `Error al archivar currículo: ${archiveError.message}` };
  }

  revalidatePath("/curriculum");
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * List templates for a user based on their organization and visibility
 */
export async function listTemplates(): Promise<ActionResponse<CurriculumTemplate[]>> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { ok: false, error: "Usuario no autenticado" };

  // Use the database RLS via the standard query, excluding archived templates
  const { data, error } = await supabase
    .from("curriculum_templates")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  const enriched = await enrichTemplateMetadata((data ?? []) as CurriculumTemplate[], userId);
  return { ok: true, data: enriched as CurriculumTemplate[] };
}

/**
 * Update an existing RA
 */
export async function updateRA(templateId: string, raId: string, payload: { code: string; description: string }): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_ra")
    .update({
      code: payload.code,
      description: payload.description,
    })
    .eq("id", raId)
    .eq("template_id", templateId);

  if (error) return { ok: false, error: `Error al actualizar RA: ${error.message}`, fields: payload };
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * Delete an RA
 */
export async function deleteRA(templateId: string, raId: string): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_ra")
    .delete()
    .eq("id", raId)
    .eq("template_id", templateId);

  if (error) return { ok: false, error: `Error al eliminar RA: ${error.message}` };
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * Update an existing CE
 */
export async function updateCE(templateId: string, ceId: string, payload: { code: string; description: string }): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_ce")
    .update({
      code: payload.code,
      description: payload.description,
    })
    .eq("id", ceId);

  if (error) return { ok: false, error: `Error al actualizar CE: ${error.message}`, fields: payload };
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

/**
 * Delete a CE
 */
export async function deleteCE(templateId: string, ceId: string): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_ce")
    .delete()
    .eq("id", ceId);

  if (error) return { ok: false, error: `Error al eliminar CE: ${error.message}` };
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// ORDERING
// ─────────────────────────────────────────────

async function _swapOrder(table: string, id: string, direction: 'up' | 'down', parentCol: string, parentId: string) {
  const supabase = await createClient();
  const { data: allItems } = await supabase
    .from(table)
    .select('id, order_index')
    .eq(parentCol, parentId)
    .order('order_index', { ascending: true });
    
  if (!allItems) return { ok: false, error: "No se encontraron items" };

  const currentIndex = allItems.findIndex((x: any) => x.id === id);
  if (currentIndex === -1) return { ok: false, error: "Item no encontrado" };

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= allItems.length) return { ok: false, error: "Movimiento inválido" };

  // Swap order_index
  const currentItem = allItems[currentIndex];
  const targetItem = allItems[targetIndex];

  const currentOrder = currentItem.order_index ?? currentIndex;
  const targetOrder = targetItem.order_index ?? targetIndex;

  await supabase.from(table).update({ order_index: targetOrder }).eq("id", currentItem.id);
  await supabase.from(table).update({ order_index: currentOrder }).eq("id", targetItem.id);

  return { ok: true };
}

export async function moveTemplateRA(templateId: string, raId: string, direction: 'up' | 'down'): Promise<ActionResponse<any>> {
  const res = await _swapOrder("template_ra", raId, direction, "template_id", templateId);
  if (res.ok) revalidatePath(`/curriculum/${templateId}`);
  return res as any;
}

export async function moveTemplateCE(templateId: string, raId: string, ceId: string, direction: 'up' | 'down'): Promise<ActionResponse<any>> {
  const res = await _swapOrder("template_ce", ceId, direction, "template_ra_id", raId);
  if (res.ok) revalidatePath(`/curriculum/${templateId}`);
  return res as any;
}

export async function updateTemplateRAOrder(templateId: string, orderedIds: string[]): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const promises = orderedIds.map((id, index) => 
    supabase.from("template_ra").update({ order_index: index }).eq("id", id).eq("template_id", templateId)
  );
  await Promise.all(promises);
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}

export async function updateTemplateCEOrder(templateId: string, orderedIds: string[]): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const promises = orderedIds.map((id, index) => 
    supabase.from("template_ce").update({ order_index: index }).eq("id", id)
  );
  await Promise.all(promises);
  revalidatePath(`/curriculum/${templateId}`);
  return { ok: true, data: null };
}
