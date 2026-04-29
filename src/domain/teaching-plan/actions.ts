"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase";
import { createPlanSchema, updatePlanSchema, updatePlanRAConfigSchema, planRASchema, planCESchema, planTeachingUnitSchema, planInstrumentSchema } from "./schemas";
import { type TeachingPlan, type TeachingPlanFull, type PlanRA, type PlanCE } from "./types";
import { z } from "zod";

export type ActionResponse<T = any> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: any };

async function getCurrentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function canCurrentUserEditPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  plan: { owner_profile_id: string }
): Promise<boolean> {
  const userId = await getCurrentUserId(supabase);
  if (!userId) return false;
  return plan.owner_profile_id === userId;
}

async function enrichPlansMetadata<T extends { owner_profile_id: string; source_template_id?: string | null }>(
  plans: T[],
  currentUserId: string
): Promise<(T & { owner_name?: string | null; source_template_name?: string | null; is_owner: boolean; can_edit: boolean })[]> {
  if (plans.length === 0) return [];

  const adminClient = createAdminClient();
  const ownerIds = Array.from(new Set(plans.map((plan) => plan.owner_profile_id).filter(Boolean)));
  const templateIds = Array.from(new Set(plans.map((plan) => plan.source_template_id).filter(Boolean))) as string[];

  const [{ data: owners }, { data: templates }] = await Promise.all([
    ownerIds.length > 0
      ? adminClient.from("profiles").select("id, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    templateIds.length > 0
      ? adminClient.from("curriculum_templates").select("id, module_name, program_title, program_code, program_level, program_course").in("id", templateIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const ownerNameById = new Map((owners ?? []).map((owner) => [owner.id, owner.full_name]));
  const templateMetadataById = new Map((templates ?? []).map((t) => [t.id, t]));

  return plans.map((plan) => {
    const isOwner = plan.owner_profile_id === currentUserId;
    return {
      ...plan,
      owner_name: ownerNameById.get(plan.owner_profile_id) ?? null,
      source_template_name: plan.source_template_id ? templateMetadataById.get(plan.source_template_id)?.module_name ?? null : null,
      program_title: plan.source_template_id ? templateMetadataById.get(plan.source_template_id)?.program_title ?? null : null,
      program_code: plan.source_template_id ? templateMetadataById.get(plan.source_template_id)?.program_code ?? null : null,
      program_level: plan.source_template_id ? templateMetadataById.get(plan.source_template_id)?.program_level ?? null : null,
      program_course: plan.source_template_id ? templateMetadataById.get(plan.source_template_id)?.program_course ?? null : null,
      is_owner: isOwner,
      can_edit: isOwner,
    };
  });
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

/**
 * List all teaching plans visible to the current user.
 */
export async function listPlans(): Promise<ActionResponse<TeachingPlan[]>> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { ok: false, error: "Usuario no autenticado" };

  const { data, error } = await supabase
    .from("teaching_plans")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  const enriched = await enrichPlansMetadata((data ?? []) as TeachingPlan[], userId);
  return { ok: true, data: enriched as TeachingPlan[] };
}

/**
 * Get a single teaching plan with its full RA/CE structure
 */
export async function getPlan(planId: string): Promise<ActionResponse<TeachingPlanFull>> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

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
        ras_coverage:plan_instrument_ra (plan_ra_id, coverage_percent),
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
  if (data.instruments) {
    data.instruments.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  // Map the coverage data into simpler arrays for the frontend
  const mappedUnits = (data.units || []).map((u: any) => ({
    ...u,
    ra_ids: u.ra_coverage?.map((rc: any) => rc.plan_ra_id) || []
  }));

  const mappedInstruments = (data.instruments || []).map((i: any) => ({
    ...i,
    is_pri_pmi: Boolean(i.is_pri_pmi),
    ce_weight_auto: Boolean(i.ce_weight_auto),
    unit_ids: i.units_coverage?.map((uc: any) => uc.unit_id) || [],
    ra_ids: i.ras_coverage?.map((rc: any) => rc.plan_ra_id) || [],
    ra_coverages: (i.ras_coverage || []).map((rc: any) => ({
      instrument_id: i.id,
      plan_ra_id: rc.plan_ra_id,
      coverage_percent: Number(rc.coverage_percent) || 0
    })),
    ce_weights: i.ce_weights || []
  }));

  const adminClient = createAdminClient();
  const [{ data: owner }, { data: sourceTemplate }] = await Promise.all([
    adminClient.from("profiles").select("full_name").eq("id", data.owner_profile_id).maybeSingle(),
    data.source_template_id
      ? adminClient.from("curriculum_templates").select("module_name, program_title, program_code, program_level, program_course").eq("id", data.source_template_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isOwner = Boolean(userId && data.owner_profile_id === userId);

  const fullPlan: TeachingPlanFull = {
    ...data,
    ras: data.ras || [],
    units: mappedUnits,
    instruments: mappedInstruments,
    sourceTemplateHours: data.hours_total ?? 0,
    owner_name: owner?.full_name ?? null,
    source_template_name: sourceTemplate?.module_name ?? null,
    program_title: sourceTemplate?.program_title ?? null,
    program_code: sourceTemplate?.program_code ?? null,
    program_level: sourceTemplate?.program_level ?? null,
    program_course: sourceTemplate?.program_course ?? null,
    is_owner: isOwner,
    can_edit: isOwner,
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
  visibility_scope: "private" | "organization";
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

const clonePlanSchema = z.object({
  source_plan_id: z.string().uuid(),
  title: z.string().min(1, "El título es obligatorio").max(255).optional(),
  academic_year: z.string().regex(/^\d{4}\/\d{4}$/, "Formato esperado: YYYY/YYYY").optional(),
  visibility_scope: z.enum(["private", "organization"]).default("private"),
});

export async function createPlanFromPlan(payload: {
  source_plan_id: string;
  title?: string;
  academic_year?: string;
  visibility_scope?: "private" | "organization";
}): Promise<ActionResponse<TeachingPlan>> {
  const validated = clonePlanSchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { ok: false, error: "Usuario no autenticado" };

  const { data: sourcePlan, error: sourceError } = await supabase
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
        ras_coverage:plan_instrument_ra (plan_ra_id, coverage_percent),
        ce_weights:plan_instrument_ce (*)
      )
    `)
    .eq("id", validated.data.source_plan_id)
    .single();

  if (sourceError || !sourcePlan) {
    return { ok: false, error: "No se ha encontrado la programación de origen" };
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("profile_id", userId)
    .eq("organization_id", sourcePlan.organization_id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    return { ok: false, error: "No tienes acceso para clonar esta programación" };
  }

  const { data: clonedPlan, error: createError } = await supabase
    .from("teaching_plans")
    .insert({
      organization_id: sourcePlan.organization_id,
      owner_profile_id: userId,
      source_plan_id: sourcePlan.id,
      source_template_id: sourcePlan.source_template_id,
      source_version: sourcePlan.source_version,
      title: validated.data.title?.trim() || `${sourcePlan.title} (copia)`,
      region_code: sourcePlan.region_code,
      module_code: sourcePlan.module_code,
      academic_year: validated.data.academic_year || sourcePlan.academic_year,
      visibility_scope: validated.data.visibility_scope ?? "private",
      status: "draft",
      hours_total: sourcePlan.hours_total || 0,
      ce_weight_auto: Boolean(sourcePlan.ce_weight_auto),
      imported_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError || !clonedPlan) {
    return { ok: false, error: `Error al clonar la programación: ${createError?.message}` };
  }

  const raIdMap = new Map<string, string>();
  const ceIdMap = new Map<string, string>();
  const unitIdMap = new Map<string, string>();

  for (const ra of sourcePlan.ras ?? []) {
    const { data: newRa, error: raError } = await supabase
      .from("plan_ra")
      .insert({
        plan_id: clonedPlan.id,
        code: ra.code,
        description: ra.description,
        weight_global: ra.weight_global,
        active_t1: ra.active_t1,
        active_t2: ra.active_t2,
        active_t3: ra.active_t3,
        order_index: ra.order_index,
      })
      .select()
      .single();

    if (raError || !newRa) {
      return { ok: false, error: `Error al clonar el RA ${ra.code}: ${raError?.message}` };
    }

    raIdMap.set(ra.id, newRa.id);

    for (const ce of ra.ces ?? []) {
      const { data: newCe, error: ceError } = await supabase
        .from("plan_ce")
        .insert({
          plan_ra_id: newRa.id,
          code: ce.code,
          description: ce.description,
          weight_in_ra: ce.weight_in_ra,
          order_index: ce.order_index,
        })
        .select()
        .single();

      if (ceError || !newCe) {
        return { ok: false, error: `Error al clonar el CE ${ce.code}: ${ceError?.message}` };
      }

      ceIdMap.set(ce.id, newCe.id);
    }
  }

  for (const unit of sourcePlan.units ?? []) {
    const { data: newUnit, error: unitError } = await supabase
      .from("plan_teaching_unit")
      .insert({
        plan_id: clonedPlan.id,
        code: unit.code,
        title: unit.title,
        active_t1: unit.active_t1,
        active_t2: unit.active_t2,
        active_t3: unit.active_t3,
        hours: unit.hours,
        order_index: unit.order_index,
      })
      .select()
      .single();

    if (unitError || !newUnit) {
      return { ok: false, error: `Error al clonar la UT ${unit.code}: ${unitError?.message}` };
    }

    unitIdMap.set(unit.id, newUnit.id);

    const sourceRaLinks = unit.ra_coverage ?? [];
    if (sourceRaLinks.length > 0) {
      const unitRaRows = sourceRaLinks
        .map((link: any) => {
          const clonedRaId = raIdMap.get(link.plan_ra_id);
          if (!clonedRaId) return null;
          return { unit_id: newUnit.id, plan_ra_id: clonedRaId };
        })
        .filter(Boolean);

      if (unitRaRows.length > 0) {
        const { error: linkError } = await supabase.from("plan_unit_ra").insert(unitRaRows);
        if (linkError) {
          return { ok: false, error: `Error al clonar las relaciones RA/UT: ${linkError.message}` };
        }
      }
    }
  }

  for (const instrument of sourcePlan.instruments ?? []) {
    const { data: newInstrument, error: instrumentError } = await supabase
      .from("plan_instrument")
      .insert({
        plan_id: clonedPlan.id,
        code: instrument.code,
        type: instrument.type,
        is_pri_pmi: Boolean(instrument.is_pri_pmi),
        ce_weight_auto: Boolean(instrument.ce_weight_auto),
        name: instrument.name,
        description: instrument.description,
      })
      .select()
      .single();

    if (instrumentError || !newInstrument) {
      return { ok: false, error: `Error al clonar el instrumento ${instrument.code}: ${instrumentError?.message}` };
    }

    const unitRows = (instrument.units_coverage ?? [])
      .map((unitCoverage: any) => {
        const clonedUnitId = unitIdMap.get(unitCoverage.unit_id);
        if (!clonedUnitId) return null;
        return { instrument_id: newInstrument.id, unit_id: clonedUnitId };
      })
      .filter(Boolean);

    if (unitRows.length > 0) {
      const { error: unitCoverageError } = await supabase.from("plan_instrument_unit").insert(unitRows);
      if (unitCoverageError) {
        return { ok: false, error: `Error al clonar las UT del instrumento ${instrument.code}: ${unitCoverageError.message}` };
      }
    }

    const raRows = (instrument.ras_coverage ?? [])
      .map((raCoverage: any) => {
        const clonedRaId = raIdMap.get(raCoverage.plan_ra_id);
        if (!clonedRaId) return null;
        return {
          instrument_id: newInstrument.id,
          plan_ra_id: clonedRaId,
          coverage_percent: raCoverage.coverage_percent,
        };
      })
      .filter(Boolean);

    if (raRows.length > 0) {
      const { error: raCoverageError } = await supabase.from("plan_instrument_ra").insert(raRows);
      if (raCoverageError) {
        return { ok: false, error: `Error al clonar la cobertura RA del instrumento ${instrument.code}: ${raCoverageError.message}` };
      }
    }

    const ceRows = (instrument.ce_weights ?? [])
      .map((ceWeight: any) => {
        const clonedCeId = ceIdMap.get(ceWeight.plan_ce_id);
        if (!clonedCeId) return null;
        return {
          instrument_id: newInstrument.id,
          plan_ce_id: clonedCeId,
          weight: ceWeight.weight,
        };
      })
      .filter(Boolean);

    if (ceRows.length > 0) {
      const { error: ceWeightError } = await supabase.from("plan_instrument_ce").insert(ceRows);
      if (ceWeightError) {
        return { ok: false, error: `Error al clonar los CEs del instrumento ${instrument.code}: ${ceWeightError.message}` };
      }
    }
  }

  revalidatePath("/plans");
  return { ok: true, data: clonedPlan as TeachingPlan };
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export async function updatePlan(planId: string, payload: {
  title?: string;
  academic_year?: string;
  visibility_scope?: "private" | "organization";
  status?: "draft" | "published";
  hours_total?: number;
}): Promise<ActionResponse<TeachingPlan>> {
  const validated = updatePlanSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data: existingPlan } = await supabase
    .from("teaching_plans")
    .select("owner_profile_id")
    .eq("id", planId)
    .single();

  if (!existingPlan) return { ok: false, error: "Programación no encontrada" };
  if (!(await canCurrentUserEditPlan(supabase, existingPlan))) {
    return { ok: false, error: "Acceso denegado: esta programación solo la puede editar su creador." };
  }

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
 * Publish a teaching plan. Makes it visible and selectable from the Evaluations module.
 * Does NOT require hard invariants to pass — warnings are returned but the plan is still published.
 */
export async function publishPlan(planId: string): Promise<ActionResponse<TeachingPlan & { warnings: string[] }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // Get current plan
  const { data: plan, error: planError } = await supabase
    .from("teaching_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) return { ok: false, error: "Plan no encontrado" };

  if (plan.owner_profile_id !== user.id) {
    return { ok: false, error: "No tienes permiso para publicar esta programación" };
  }

  if (plan.status === "published") return { ok: false, error: "La programación ya está publicada" };

  // Compute warnings (non-blocking)
  const warnings = await _computePlanWarnings(planId);

  // Update status to published
  const { data, error } = await supabase
    .from("teaching_plans")
    .update({ status: "published" })
    .eq("id", planId)
    .select()
    .single();

  if (error) return { ok: false, error: `Error al publicar: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
  return { ok: true, data: { ...(data as TeachingPlan), warnings } };
}

/**
 * Unpublish a teaching plan. Reverts it to draft status.
 */
export async function unpublishPlan(planId: string): Promise<ActionResponse<TeachingPlan>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // Get current plan
  const { data: plan, error: planError } = await supabase
    .from("teaching_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) return { ok: false, error: "Plan no encontrado" };

  if (plan.owner_profile_id !== user.id) {
    return { ok: false, error: "No tienes permiso para despublicar esta programación" };
  }

  if (plan.status !== "published") return { ok: false, error: "La programación no está publicada" };

  // Update status to draft
  const { data, error } = await supabase
    .from("teaching_plans")
    .update({ status: "draft" })
    .eq("id", planId)
    .select()
    .single();

  if (error) return { ok: false, error: `Error al despublicar: ${error.message}` };
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
  const { data: existingPlan } = await supabase
    .from("teaching_plans")
    .select("owner_profile_id")
    .eq("id", planId)
    .single();

  if (!existingPlan) return { ok: false, error: "Programación no encontrada" };
  if (!(await canCurrentUserEditPlan(supabase, existingPlan))) {
    return { ok: false, error: "Acceso denegado: esta programación solo la puede eliminar su creador." };
  }

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

export async function updatePlanInstrumentOrder(planId: string, orderedIds: string[]): Promise<ActionResponse> {
  const supabase = await createClient();
  const promises = orderedIds.map((id, index) => 
    supabase.from("plan_instrument").update({ order_index: index }).eq("id", id).eq("plan_id", planId)
  );
  await Promise.all(promises);
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

// ARCHIVING
// =================================================================

/**
 * Archive a teaching plan if it has no associated evaluations
 */
export async function archiveTeachingPlan(planId: string): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  
  // Check if plan exists and user has permission
  const { data: plan, error: planError } = await supabase
    .from("teaching_plans")
    .select("id, organization_id, owner_profile_id")
    .eq("id", planId)
    .single();
    
  if (planError || !plan) {
    return { ok: false, error: "Programación no encontrada" };
  }
  
  // Check user permissions
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || plan.owner_profile_id !== user.id) {
    return { ok: false, error: "No tienes permiso para archivar esta programación" };
  }
  
  // Check if there are any evaluations using this plan
  const { data: evaluations, error: evaluationsError } = await supabase
    .from("evaluations")
    .select("id")
    .eq("plan_id", planId)
    .limit(1);
    
  if (evaluationsError) {
    return { ok: false, error: "Error al verificar evaluaciones asociadas" };
  }
  
  if (evaluations && evaluations.length > 0) {
    return { ok: false, error: "No se puede archivar una programación que tiene evaluaciones asociadas" };
  }
  
  // Archive the plan
  const { error: archiveError } = await supabase
    .from("teaching_plans")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", planId);
    
  if (archiveError) {
    return { ok: false, error: `Error al archivar programación: ${archiveError.message}` };
  }
  
  revalidatePath("/plans");
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// PLAN INSTRUMENT CRUD
// ─────────────────────────────────────────────

async function validateManualInstrumentCeWeights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planId: string,
  isAutomationEnabled: boolean,
  raCoverages: { raId: string; coveragePercent: number }[],
  ceWeights: { ceId: string; weight: number }[]
): Promise<string | null> {
  if (isAutomationEnabled) return null;

  const selectedRaIds = Array.from(new Set(raCoverages.map((rc) => rc.raId)));
  if (selectedRaIds.length === 0) return null;

  const [raResult, ceResult] = await Promise.all([
    supabase
      .from("plan_ra")
      .select("id, code")
      .eq("plan_id", planId)
      .in("id", selectedRaIds),
    supabase
      .from("plan_ce")
      .select("id, plan_ra_id")
      .in("plan_ra_id", selectedRaIds),
  ]);

  if (raResult.error) {
    return `Error al leer los RAs del instrumento: ${raResult.error.message}`;
  }
  if (ceResult.error) {
    return `Error al leer los CEs del instrumento: ${ceResult.error.message}`;
  }

  const raCodeById = new Map((raResult.data ?? []).map((ra: any) => [ra.id, ra.code]));
  const ceSumByRa = new Map<string, number>();

  for (const ce of ceResult.data ?? []) {
    const current = ceSumByRa.get(ce.plan_ra_id) ?? 0;
    const next = ceWeights
      .filter((weight) => weight.ceId === ce.id)
      .reduce((sum, weight) => sum + Number(weight.weight || 0), 0);
    ceSumByRa.set(ce.plan_ra_id, current + next);
  }

  const invalids: string[] = [];
  for (const raId of selectedRaIds) {
    const total = ceSumByRa.get(raId) ?? 0;
    if (Math.abs(total - 100) > 0.1) {
      invalids.push(`RA "${raCodeById.get(raId) || raId}": los porcentajes de CE deben sumar 100% (actual: ${total.toFixed(2)}%).`);
    }
  }

  return invalids.length > 0 ? invalids.join(" ") : null;
}

export async function addPlanInstrument(
  planId: string,
  payload: { code: string; type: string; is_pri_pmi?: boolean; ce_weight_auto?: boolean; name: string; description?: string | null },
  unitIds: string[] = [],
  raCoverages: { raId: string; coveragePercent: number }[] = [],
  ceWeights: { ceId: string; weight: number }[] = []
): Promise<ActionResponse<any>> {
  const validated = planInstrumentSchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos del instrumento inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("teaching_plans")
    .select("ce_weight_auto")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return { ok: false, error: "Plan no encontrado" };
  }

  const isAutomationEnabled = Boolean(plan.ce_weight_auto) && Boolean(validated.data.ce_weight_auto ?? true);
  const manualWeightsError = await validateManualInstrumentCeWeights(
    supabase,
    planId,
    isAutomationEnabled,
    raCoverages,
    ceWeights
  );
  if (manualWeightsError) {
    return { ok: false, error: manualWeightsError };
  }

  // 1. Create instrument
  const { data: instrument, error } = await supabase
    .from("plan_instrument")
    .insert({ plan_id: planId, ...validated.data })
    .select()
    .single();

  if (error || !instrument) {
    let errorMessage = error?.message || "Error desconocido";
    if (errorMessage.includes("duplicate key")) {
      errorMessage = `Ya existe un instrumento con el código "${validated.data.code}" en esta programación`;
    }
    return { ok: false, error: `Error al añadir instrumento: ${errorMessage}` };
  }

  // 2. Link UTs
  if (unitIds.length > 0) {
    const unitLinks = unitIds.map(uId => ({
      instrument_id: instrument.id,
      unit_id: uId
    }));
    const { error: ulError } = await supabase.from("plan_instrument_unit").insert(unitLinks);
    if (ulError) return { ok: false, error: `Error al enlazar unidades: ${ulError.message}` };
  }

  // 2b. Link RAs with coverage_percent
  if (raCoverages.length > 0) {
    const raLinks = raCoverages.map(rc => ({
      instrument_id: instrument.id,
      plan_ra_id: rc.raId,
      coverage_percent: rc.coveragePercent
    }));
    const { error: rlError } = await supabase.from("plan_instrument_ra").insert(raLinks);
    if (rlError) return { ok: false, error: `Error al enlazar RAs: ${rlError.message}` };
  }

  // 3. Link CEs with weights
  if (ceWeights.length > 0) {
    const ceLinks = ceWeights.map(cw => ({
      instrument_id: instrument.id,
      plan_ce_id: cw.ceId,
      weight: cw.weight
    }));
    const { error: clError } = await supabase.from("plan_instrument_ce").insert(ceLinks);
    if (clError) return { ok: false, error: `Error al asignar pesos CE: ${clError.message}` };
  }

  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: instrument };
}

export async function updatePlanInstrument(
  planId: string,
  instrumentId: string,
  payload: { code?: string; type?: string; is_pri_pmi?: boolean; ce_weight_auto?: boolean; name?: string; description?: string | null },
  unitIds?: string[],
  raCoverages?: { raId: string; coveragePercent: number }[],
  ceWeights?: { ceId: string; weight: number }[]
): Promise<ActionResponse<any>> {
  const supabase = await createClient();

  if (ceWeights !== undefined || raCoverages !== undefined) {
    const { data: plan, error: planError } = await supabase
      .from("teaching_plans")
      .select("ce_weight_auto")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return { ok: false, error: "Plan no encontrado" };
    }

    const isAutomationEnabled = Boolean(plan.ce_weight_auto) && Boolean(payload.ce_weight_auto ?? true);
    const manualWeightsError = await validateManualInstrumentCeWeights(
      supabase,
      planId,
      isAutomationEnabled,
      raCoverages ?? [],
      ceWeights ?? []
    );
    if (manualWeightsError) {
      return { ok: false, error: manualWeightsError };
    }
  }

  // 1. Update metadata
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from("plan_instrument")
      .update(payload)
      .eq("id", instrumentId)
      .eq("plan_id", planId);
    
    if (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("duplicate key")) {
        errorMessage = `Ya existe un instrumento con el código "${payload.code}" en esta programación`;
      }
      return { ok: false, error: `Error al actualizar instrumento: ${errorMessage}` };
    }
  }

  // 2. Update UT links (sync)
  if (unitIds !== undefined) {
    await supabase.from("plan_instrument_unit").delete().eq("instrument_id", instrumentId);
    if (unitIds.length > 0) {
      const unitLinks = unitIds.map(uId => ({ instrument_id: instrumentId, unit_id: uId }));
      const { error: ulError } = await supabase.from("plan_instrument_unit").insert(unitLinks);
      if (ulError) return { ok: false, error: `Error al actualizar unidades: ${ulError.message}` };
    }
  }

  // 2b. Update RA links with coverage_percent (sync)
  if (raCoverages !== undefined) {
    await supabase.from("plan_instrument_ra").delete().eq("instrument_id", instrumentId);
    if (raCoverages.length > 0) {
      const raLinks = raCoverages.map(rc => ({
        instrument_id: instrumentId,
        plan_ra_id: rc.raId,
        coverage_percent: rc.coveragePercent
      }));
      const { error: rlError } = await supabase.from("plan_instrument_ra").insert(raLinks);
      if (rlError) return { ok: false, error: `Error al actualizar RAs: ${rlError.message}` };
    }
  }

  // 3. Update CE weights (sync)
  if (ceWeights !== undefined) {
    await supabase.from("plan_instrument_ce").delete().eq("instrument_id", instrumentId);
    if (ceWeights.length > 0) {
      const ceLinks = ceWeights.map(cw => ({
        instrument_id: instrumentId,
        plan_ce_id: cw.ceId,
        weight: cw.weight
      }));
      const { error: clError } = await supabase.from("plan_instrument_ce").insert(ceLinks);
      if (clError) return { ok: false, error: `Error al actualizar pesos CE: ${clError.message}` };
    }
  }

  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

export async function deletePlanInstrument(planId: string, instrumentId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_instrument").delete().eq("id", instrumentId).eq("plan_id", planId);
  
  if (error) return { ok: false, error: `Error al eliminar instrumento: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// CE WEIGHT AUTOMATION
// ─────────────────────────────────────────────

/**
 * Toggle the ce_weight_auto flag on a teaching plan
 */
export async function toggleCeWeightAuto(
  planId: string,
  enabled: boolean
): Promise<ActionResponse<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("teaching_plans")
    .update({ ce_weight_auto: enabled })
    .eq("id", planId);

  if (error) return { ok: false, error: `Error al cambiar automatización: ${error.message}` };
  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

/**
 * Bulk-update the weight_in_ra for all CEs of a given RA
 * Expects ceWeights to cover ALL CEs and sum to 100.
 */
export async function updateCeWeightsForRA(
  planId: string,
  raId: string,
  ceWeights: { ceId: string; weightInRa: number }[]
): Promise<ActionResponse<null>> {
  // Validate sum = 100
  const total = ceWeights.reduce((sum, cw) => sum + cw.weightInRa, 0);
  if (Math.abs(total - 100) > 0.1) {
    return { ok: false, error: `La suma de pesos de los CEs debe ser 100% (actual: ${total.toFixed(2)}%)` };
  }

  const supabase = await createClient();

  // Update each CE weight
  for (const cw of ceWeights) {
    const { error } = await supabase
      .from("plan_ce")
      .update({ weight_in_ra: cw.weightInRa })
      .eq("id", cw.ceId)
      .eq("plan_ra_id", raId);

    if (error) return { ok: false, error: `Error al actualizar peso de CE: ${error.message}` };
  }

  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Compute warnings for a teaching plan.
 * Returns a list of human-readable warning messages.
 * Does NOT block any operation — these are informational only.
 */
async function _computePlanWarnings(planId: string): Promise<string[]> {
  const supabase = await createClient();
  const warnings: string[] = [];

  // 1. Check RA weights sum to 100%
  const { data: ras } = await supabase
    .from("plan_ra")
    .select("id, code, weight_global")
    .eq("plan_id", planId);

  if (ras && ras.length > 0) {
    const totalWeight = ras.reduce((sum, ra) => sum + Number(ra.weight_global), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      warnings.push(`Los pesos de los RA suman ${totalWeight.toFixed(2)}% (deberían sumar 100%).`);
    }

    // 2. Check each RA's CE weights sum to 100%
    for (const ra of ras) {
      const { data: ces } = await supabase
        .from("plan_ce")
        .select("id, code, weight_in_ra")
        .eq("plan_ra_id", ra.id);

      if (ces && ces.length > 0) {
        const ceTotal = ces.reduce((sum, ce) => sum + Number(ce.weight_in_ra), 0);
        if (Math.abs(ceTotal - 100) > 0.01) {
          warnings.push(`RA "${ra.code}": los pesos de los CE suman ${ceTotal.toFixed(2)}% (deberían sumar 100%).`);
        }
      } else {
        warnings.push(`RA "${ra.code}": no tiene criterios de evaluación definidos.`);
      }
    }
  } else {
    warnings.push("La programación no tiene Resultados de Aprendizaje definidos.");
  }

  // 3. Check instruments without RA coverage — single query with JOIN
  const { data: instrumentsWithCoverage } = await supabase
    .from("plan_instrument")
    .select(`
      id, code, name,
      ra_coverages:plan_instrument_ra (id)
    `)
    .eq("plan_id", planId);

  if (instrumentsWithCoverage && instrumentsWithCoverage.length > 0) {
    for (const instrument of instrumentsWithCoverage) {
      const raCov = instrument.ra_coverages as any[] | null;
      if (!raCov || raCov.length === 0) {
        warnings.push(`Instrumento "${instrument.code}" (${instrument.name}): no tiene cobertura de RA definida.`);
      }
    }
  }

  return warnings;
}

/**
 * Get warnings for a teaching plan without modifying it.
 */
export async function getPlanWarnings(planId: string): Promise<ActionResponse<{ warnings: string[] }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  const { data: plan } = await supabase
    .from("teaching_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) return { ok: false, error: "Plan no encontrado" };

  const warnings = await _computePlanWarnings(planId);
  return { ok: true, data: { warnings } };
}

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
