"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { createPlanSchema, updatePlanSchema, updatePlanRAConfigSchema, planRASchema, planCESchema, planTeachingUnitSchema } from "./schemas";
import { type TeachingPlan, type TeachingPlanFull, type PlanRA, type PlanCE } from "./types";

export type ActionResponse<T = any> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: any };

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

/**
 * List all teaching plans owned by the current user
 */
export async function listPlans(): Promise<ActionResponse<TeachingPlan[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  const { data, error } = await supabase
    .from("teaching_plans")
    .select("*")
    .eq("owner_profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as TeachingPlan[] };
}

/**
 * Get a single teaching plan with its full RA/CE structure
 */
export async function getPlan(planId: string): Promise<ActionResponse<TeachingPlanFull>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teaching_plans")
    .select(`
      *,
      ras:plan_ra (
        *,
        ces:plan_ce (*)
      ),
      units:plan_teaching_unit (
        *,
        ra_coverage:plan_unit_ra (plan_ra_id)
      ),
      instruments:plan_instrument (
        *,
        units_coverage:plan_instrument_unit (unit_id),
        ce_weights:plan_instrument_ce (*)
      )
    `)
    .eq("id", planId)
    .single();

  if (error || !data) return { ok: false, error: "Plan no encontrado" };

  // Sort relations manually until we have proper sub-order setup in the query builder
  if (data.ras) {
    data.ras.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    data.ras.forEach((ra: any) => {
      if (ra.ces) {
        ra.ces.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
      }
    });
  }
  if (data.units) {
    data.units.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  // Map the coverage data into simpler arrays for the frontend
  const mappedUnits = (data.units || []).map((u: any) => ({
    ...u,
    ra_ids: u.ra_coverage?.map((rc: any) => rc.plan_ra_id) || []
  }));

  const mappedInstruments = (data.instruments || []).map((i: any) => ({
    ...i,
    unit_ids: i.units_coverage?.map((uc: any) => uc.unit_id) || [],
    ce_weights: i.ce_weights || []
  }));

  const fullPlan: TeachingPlanFull = {
    ...data,
    ras: data.ras || [],
    units: mappedUnits,
    instruments: mappedInstruments,
    sourceTemplateHours: data.hours_total ?? 0,
  };
  
  return { ok: true, data: fullPlan };
}

// ─────────────────────────────────────────────
// CREATE (import from template — deep copy)
// ─────────────────────────────────────────────

/**
 * Create a new Teaching Plan by deep-copying a published curriculum template
 */
export async function createPlanFromTemplate(payload: {
  title: string;
  source_template_id: string;
  academic_year: string;
  visibility_scope: "private" | "organization" | "company";
}): Promise<ActionResponse<TeachingPlan>> {
  const validated = createPlanSchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // Get user's organization
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!membership) return { ok: false, error: "No perteneces a ninguna organización" };

  // Fetch the source template with its RAs and CEs
  const { data: template, error: templateError } = await supabase
    .from("curriculum_templates")
    .select(`
      *,
      ras:template_ra (
        *,
        ces:template_ce (*)
      )
    `)
    .eq("id", validated.data.source_template_id)
    .eq("status", "published")
    .single();

  if (templateError || !template) {
    return { ok: false, error: "Currículo no encontrado o no está publicado" };
  }

  // 1. Create the teaching plan
  const { data: plan, error: planError } = await supabase
    .from("teaching_plans")
    .insert({
      organization_id: membership.organization_id,
      owner_profile_id: user.id,
      source_template_id: template.id,
      source_version: template.version,
      title: validated.data.title,
      region_code: template.region_code,
      module_code: template.module_code,
      academic_year: validated.data.academic_year,
      visibility_scope: validated.data.visibility_scope,
      status: "draft",
      hours_total: template.hours_total || 0,
      imported_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (planError || !plan) {
    return { ok: false, error: `Error al crear la programación: ${planError?.message}` };
  }

  // 2. Deep copy RAs and their CEs
  for (const ra of template.ras ?? []) {
    const { data: planRA, error: raError } = await supabase
      .from("plan_ra")
      .insert({
        plan_id: plan.id,
        code: ra.code,
        description: ra.description,
        weight_global: 0,
        order_index: ra.order_index || 0,
        active_t1: false,
        active_t2: false,
        active_t3: false,
      })
      .select()
      .single();

    if (raError || !planRA) {
      return { ok: false, error: `Error al copiar RA ${ra.code}: ${raError?.message}` };
    }

    for (const ce of ra.ces ?? []) {
      const { error: ceError } = await supabase
        .from("plan_ce")
        .insert({
          plan_ra_id: planRA.id,
          code: ce.code,
          description: ce.description,
          order_index: ce.order_index || 0,
          weight_in_ra: 0,
        });

      if (ceError) {
        return { ok: false, error: `Error al copiar CE ${ce.code}: ${ceError.message}` };
      }
    }
  }

  revalidatePath("/plans");
  return { ok: true, data: plan as TeachingPlan };
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export async function updatePlan(planId: string, payload: {
  title?: string;
  visibility_scope?: "private" | "organization" | "company";
  status?: "draft" | "ready" | "published" | "archived";
  hours_total?: number;
}): Promise<ActionResponse<TeachingPlan>> {
  const validated = updatePlanSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teaching_plans")
    .update(validated.data)
    .eq("id", planId)
    .select()
    .single();

  if (error) return { ok: false, error: `Error al actualizar: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
  return { ok: true, data: data as TeachingPlan };
}

/**
 * Update the global weight and trimester presence for a single RA in the plan
 */
export async function updatePlanRAConfig(
  planId: string,
  raId: string,
  payload: { weight_global: number; active_t1: boolean; active_t2: boolean; active_t3: boolean }
): Promise<ActionResponse<PlanRA>> {
  const validated = updatePlanRAConfigSchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_ra")
    .update(validated.data)
    .eq("id", raId)
    .eq("plan_id", planId)
    .select()
    .single();

  if (error) return { ok: false, error: `Error al actualizar RA: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: data as PlanRA };
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deletePlan(planId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.from("teaching_plans").delete().eq("id", planId);
  if (error) return { ok: false, error: `Error al eliminar: ${error.message}` };
  revalidatePath("/plans");
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// PLAN RA CRUD (edit the clone post-import)
// ─────────────────────────────────────────────

export async function addPlanRA(planId: string, payload: { code: string; description: string }): Promise<ActionResponse<PlanRA>> {
  const validated = planRASchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos del RA inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_ra")
    .insert({ plan_id: planId, ...validated.data, weight_global: 0, active_t1: false, active_t2: false, active_t3: false })
    .select()
    .single();

  if (error) {
    let errorMessage = error.message;
    if (errorMessage.includes("duplicate key")) {
      errorMessage = `Ya existe un RA con el código "${validated.data.code}" en esta programación`;
    }
    return { ok: false, error: `Error al añadir RA: ${errorMessage}` };
  }
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: data as PlanRA };
}

export async function updatePlanRA(planId: string, raId: string, payload: { code: string; description: string }): Promise<ActionResponse<PlanRA>> {
  const validated = planRASchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos del RA inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_ra")
    .update(validated.data)
    .eq("id", raId)
    .eq("plan_id", planId)
    .select()
    .single();

  if (error) {
    let errorMessage = error.message;
    if (errorMessage.includes("duplicate key")) {
      errorMessage = `Ya existe un RA con el código "${validated.data.code}" en esta programación`;
    }
    return { ok: false, error: `Error al actualizar RA: ${errorMessage}` };
  }
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: data as PlanRA };
}

export async function deletePlanRA(planId: string, raId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_ra").delete().eq("id", raId).eq("plan_id", planId);
  if (error) return { ok: false, error: `Error al eliminar RA: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// PLAN CE CRUD
// ─────────────────────────────────────────────

export async function addPlanCE(planId: string, raId: string, payload: { code: string; description: string }): Promise<ActionResponse<PlanCE>> {
  const validated = planCESchema.safeParse({ ...payload, weight_in_ra: 0 });
  if (!validated.success) {
    return { ok: false, error: "Datos del CE inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_ce")
    .insert({ plan_ra_id: raId, ...validated.data })
    .select()
    .single();

  if (error) {
    let errorMessage = error.message;
    if (errorMessage.includes("duplicate key")) {
      errorMessage = `Ya existe un CE con el código "${validated.data.code}" en este RA`;
    }
    return { ok: false, error: `Error al añadir CE: ${errorMessage}` };
  }
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: data as PlanCE };
}

export async function updatePlanCE(planId: string, ceId: string, payload: { code: string; description: string }): Promise<ActionResponse<PlanCE>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_ce")
    .update({ code: payload.code, description: payload.description })
    .eq("id", ceId)
    .select()
    .single();

  if (error) {
    let errorMessage = error.message;
    if (errorMessage.includes("duplicate key")) {
      errorMessage = `Ya existe un CE con el código "${payload.code}" en este RA`;
    }
    return { ok: false, error: `Error al actualizar CE: ${errorMessage}` };
  }
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: data as PlanCE };
}

export async function deletePlanCE(planId: string, ceId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_ce").delete().eq("id", ceId);
  if (error) return { ok: false, error: `Error al eliminar CE: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// PLAN TEACHING UNIT CRUD
// ─────────────────────────────────────────────

export async function addPlanUnit(
  planId: string, 
  payload: { code: string; title: string; active_t1: boolean; active_t2: boolean; active_t3: boolean; hours: number }, 
  raIds: string[] = []
): Promise<ActionResponse<any>> {
  // Validate basic unit info
  const validated = planTeachingUnitSchema.safeParse(payload);
  if (!validated.success) {
    // Collect refinement errors (like at_least_one_trimester)
    const errors = validated.error.flatten();
    // If there's an error in active_t1 (where the refinement path was set), use that message as the main error
    const mainError = errors.formErrors[0] || "Datos de la unidad inválidos";
    return { ok: false, error: mainError, details: errors.fieldErrors };
  }

  const supabase = await createClient();
  
  // Create unit
  const { data: unit, error } = await supabase
    .from("plan_teaching_unit")
    .insert({ plan_id: planId, ...validated.data })
    .select()
    .single();

  if (error || !unit) {
    let errorMessage = error?.message || "Error desconocido";
    if (errorMessage.includes("at_least_one_trimester_chk")) {
      errorMessage = "Debes seleccionar al menos un trimestre para la unidad";
    } else if (errorMessage.includes("duplicate key")) {
      errorMessage = `Ya existe una UT con el código "${validated.data.code}" en esta programación`;
    }
    return { ok: false, error: `Error al añadir UT: ${errorMessage}` };
  }

  // If there are selected RAs, link them in the junction table
  if (raIds.length > 0) {
    const raLinks = raIds.map(raId => ({
      unit_id: unit.id,
      plan_ra_id: raId
    }));
    
    const { error: linkError } = await supabase.from("plan_unit_ra").insert(raLinks);
    if (linkError) return { ok: false, error: `Error al enlazar RAs a UT: ${linkError.message}` };
  }

  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: unit };
}

export async function updatePlanUnit(
  planId: string,
  unitId: string,
  payload: { title?: string; code?: string; active_t1?: boolean; active_t2?: boolean; active_t3?: boolean; hours?: number },
  raIds?: string[]
): Promise<ActionResponse<any>> {
  // Validate basic trimesters if provied in payload
  if (payload.active_t1 !== undefined && payload.active_t2 !== undefined && payload.active_t3 !== undefined) {
    if (!payload.active_t1 && !payload.active_t2 && !payload.active_t3) {
      return { ok: false, error: "Debes seleccionar al menos un trimestre" };
    }
  }

  const supabase = await createClient();
  
  // Update unit metadata
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from("plan_teaching_unit")
      .update(payload)
      .eq("id", unitId)
      .eq("plan_id", planId);
      
    if (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("at_least_one_trimester_chk")) {
        errorMessage = "Debes seleccionar al menos un trimestre para la unidad";
      } else if (errorMessage.includes("duplicate key")) {
        errorMessage = `Ya existe una UT con el código "${payload.code}" en esta programación`;
      }
      return { ok: false, error: `Error al actualizar UT: ${errorMessage}` };
    }
  }

  // Update RAs links if provided
  if (raIds !== undefined) {
    // Delete existing links
    await supabase.from("plan_unit_ra").delete().eq("unit_id", unitId);
    
    // Insert new links
    if (raIds.length > 0) {
      const raLinks = raIds.map(raId => ({
        unit_id: unitId,
        plan_ra_id: raId
      }));
      const { error: linkError } = await supabase.from("plan_unit_ra").insert(raLinks);
      if (linkError) return { ok: false, error: `Error al modificar enlaces RA: ${linkError.message}` };
    }
  }

  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

export async function deletePlanUnit(planId: string, unitId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_teaching_unit").delete().eq("id", unitId).eq("plan_id", planId);
  
  if (error) return { ok: false, error: `Error al eliminar UT: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
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

export async function movePlanRA(planId: string, raId: string, direction: 'up' | 'down'): Promise<ActionResponse> {
  const res = await _swapOrder("plan_ra", raId, direction, "plan_id", planId);
  if (res.ok) revalidatePath(`/plans/${planId}`);
  return res as any;
}

export async function movePlanCE(planId: string, raId: string, ceId: string, direction: 'up' | 'down'): Promise<ActionResponse> {
  const res = await _swapOrder("plan_ce", ceId, direction, "plan_ra_id", raId);
  if (res.ok) revalidatePath(`/plans/${planId}`);
  return res as any;
}

export async function movePlanUnit(planId: string, unitId: string, direction: 'up' | 'down'): Promise<ActionResponse> {
  const res = await _swapOrder("plan_teaching_unit", unitId, direction, "plan_id", planId);
  if (res.ok) revalidatePath(`/plans/${planId}`);
  return res as any;
}

export async function updatePlanRAOrder(planId: string, orderedIds: string[]): Promise<ActionResponse> {
  const supabase = await createClient();
  // We can do an upsert or multiple updates. For a small array, Promise.all is fine.
  const promises = orderedIds.map((id, index) => 
    supabase.from("plan_ra").update({ order_index: index }).eq("id", id).eq("plan_id", planId)
  );
  await Promise.all(promises);
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

export async function updatePlanCEOrder(planId: string, orderedIds: string[]): Promise<ActionResponse> {
  const supabase = await createClient();
  const promises = orderedIds.map((id, index) => 
    supabase.from("plan_ce").update({ order_index: index }).eq("id", id)
  );
  await Promise.all(promises);
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

export async function updatePlanUnitOrder(planId: string, orderedIds: string[]): Promise<ActionResponse> {
  const supabase = await createClient();
  const promises = orderedIds.map((id, index) => 
    supabase.from("plan_teaching_unit").update({ order_index: index }).eq("id", id).eq("plan_id", planId)
  );
  await Promise.all(promises);
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * List published templates available to the current user for import
 */
export async function listPublishedTemplates(): Promise<ActionResponse<any[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("curriculum_templates")
    .select("id, module_name, module_code, academic_year, version, region_code, organization_id, visibility_scope")
    .eq("status", "published")
    .order("module_name");

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}
