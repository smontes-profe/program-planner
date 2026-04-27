"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import {
  createEvaluationContextSchema,
  updateEvaluationContextSchema,
  createStudentSchema,
  updateStudentSchema,
  bulkImportStudentsSchema,
  upsertInstrumentScoreSchema,
  updateTrimesterLockSchema,
  upsertTrimesterAdjustedOverrideSchema,
  upsertRAManualOverrideSchema,
  upsertFinalManualOverrideSchema,
} from "./schemas";
import {
  type EvaluationContext,
  type EvaluationStudent,
  type InstrumentScore,
  type EvaluationContextFull,
  type EvaluationTrimesterLocks,
  type EvaluationTrimesterAutoSnapshot,
  type EvaluationTrimesterAdjustedOverride,
  type EvaluationRAManualOverride,
  type EvaluationFinalManualOverride,
  type TrimesterKey,
} from "./types";
import { computeAllStudentGrades, type GradeComputationResult } from "./grade-engine";
import { getPlan } from "@/domain/teaching-plan/actions";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";

export type ActionResponse<T = any> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: any };

export async function listPublishedPlans(): Promise<ActionResponse<{ id: string; title: string; module_code: string; academic_year: string }[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };
  const { data, error } = await supabase
    .from("teaching_plans")
    .select("id, title, module_code, academic_year")
    .eq("owner_profile_id", user.id)
    .eq("status", "published")
    .order("title");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

// ─────────────────────────────────────────────
// EVALUATION CONTEXTS
// ─────────────────────────────────────────────

export async function listEvaluationContexts(): Promise<ActionResponse<EvaluationContext[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  const { data, error } = await supabase
    .from("evaluation_contexts")
    .select(`
      *,
      modules:evaluation_context_modules(teaching_plan_id),
      student_count:evaluation_students!evaluation_students_context_id_fkey(count)
    `)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const contexts: EvaluationContext[] = (data || []).map((ctx: any) => ({
    id: ctx.id,
    organization_id: ctx.organization_id,
    created_by_profile_id: ctx.created_by_profile_id,
    academic_year: ctx.academic_year,
    title: ctx.title,
    status: ctx.status,
    created_at: ctx.created_at,
    plan_ids: ctx.modules?.map((m: any) => m.teaching_plan_id) || [],
    plan_count: ctx.modules?.length || 0,
    student_count: ctx.student_count?.[0]?.count || 0,
  }));

  return { ok: true, data: contexts };
}

export async function getEvaluationContext(contextId: string): Promise<ActionResponse<EvaluationContextFull>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  const { data: ctx, error } = await supabase
    .from("evaluation_contexts")
    .select("*")
    .eq("id", contextId)
    .single();

  if (error || !ctx) return { ok: false, error: "Contexto no encontrado" };

  // Linked teaching plans with summary info
  const { data: modules } = await supabase
    .from("evaluation_context_modules")
    .select(`
      teaching_plan_id,
      plan:teaching_plans(id, title, module_code, academic_year)
    `)
    .eq("context_id", contextId);

  const { data: students } = await supabase
    .from("evaluation_students")
    .select("*")
    .eq("context_id", contextId)
    .eq("active", true)
    .order("student_name");

  const fullContext: EvaluationContextFull = {
    id: ctx.id,
    organization_id: ctx.organization_id,
    created_by_profile_id: ctx.created_by_profile_id,
    academic_year: ctx.academic_year,
    title: ctx.title,
    status: ctx.status,
    created_at: ctx.created_at,
    plan_ids: modules?.map((m: any) => m.teaching_plan_id) || [],
    plans: modules?.map((m: any) => m.plan).filter(Boolean) || [],
    students: (students || []) as EvaluationStudent[],
  };

  return { ok: true, data: fullContext };
}

export async function createEvaluationContext(payload: {
  title: string;
  academic_year: string;
}): Promise<ActionResponse<EvaluationContext>> {
  const validated = createEvaluationContextSchema.omit({ organization_id: true }).safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos inválidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // Get organization from user's memberships
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .single();
  if (!membership) return { ok: false, error: "No perteneces a ninguna organización activa" };

  const { data, error } = await supabase
    .from("evaluation_contexts")
    .insert({
      ...validated.data,
      organization_id: membership.organization_id,
      created_by_profile_id: user.id,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/evaluations");
  return { ok: true, data: data as EvaluationContext };
}

export async function updateEvaluationContext(
  contextId: string,
  payload: { title?: string; academic_year?: string; status?: string }
): Promise<ActionResponse<EvaluationContext>> {
  const validated = updateEvaluationContextSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_contexts")
    .update(validated.data)
    .eq("id", contextId)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/evaluations");
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: data as EvaluationContext };
}

export async function deleteEvaluationContext(contextId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_contexts")
    .delete()
    .eq("id", contextId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/evaluations");
  return { ok: true, data: null };
}

export async function linkTeachingPlan(
  contextId: string,
  teachingPlanId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_context_modules")
    .insert({ context_id: contextId, teaching_plan_id: teachingPlanId });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: null };
}

export async function unlinkTeachingPlan(
  contextId: string,
  teachingPlanId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_context_modules")
    .delete()
    .eq("context_id", contextId)
    .eq("teaching_plan_id", teachingPlanId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────

export async function addStudent(
  contextId: string,
  payload: { student_name: string; last_name?: string | null; student_code?: string | null; student_email?: string | null }
): Promise<ActionResponse<EvaluationStudent>> {
  const validated = createStudentSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_students")
    .insert({ context_id: contextId, ...validated.data })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: data as EvaluationStudent };
}

export async function updateStudent(
  contextId: string,
  studentId: string,
  payload: { student_name?: string; last_name?: string | null; student_code?: string | null; student_email?: string | null; notes?: string | null; active?: boolean }
): Promise<ActionResponse<EvaluationStudent>> {
  const validated = updateStudentSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_students")
    .update(validated.data)
    .eq("id", studentId)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: data as EvaluationStudent };
}

export async function deleteStudent(contextId: string, studentId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_students")
    .delete()
    .eq("id", studentId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: null };
}

export async function bulkImportStudents(
  contextId: string,
  students: { student_name: string; last_name?: string | null; student_code?: string | null; student_email?: string | null }[]
): Promise<ActionResponse<EvaluationStudent[]>> {
  const validated = bulkImportStudentsSchema.safeParse({ students });
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const rows = students.map(s => ({
    context_id: contextId,
    student_name: s.student_name,
    last_name: s.last_name || null,
    student_code: s.student_code || null,
    student_email: s.student_email || null,
  }));

  const { data, error } = await supabase
    .from("evaluation_students")
    .insert(rows)
    .select();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: data as EvaluationStudent[] };
}

// ─────────────────────────────────────────────
// INSTRUMENT SCORES
// ─────────────────────────────────────────────

export async function upsertInstrumentScore(
  contextId: string,
  payload: {
    instrument_id: string;
    student_id: string;
    plan_ce_id?: string | null;
    score_value: number | null;
    score_date?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<InstrumentScore>> {
  const validated = upsertInstrumentScoreSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("instrument_student_scores")
    .upsert(
      { context_id: contextId, ...validated.data },
      { onConflict: "context_id,instrument_id,student_id,plan_ce_key" }
    )
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: data as InstrumentScore };
}

export async function bulkUpsertScores(
  contextId: string,
  scores: {
    instrument_id: string;
    student_id: string;
    plan_ce_id?: string | null;
    score_value: number | null;
  }[]
): Promise<ActionResponse> {
  const supabase = await createClient();
  const rows = scores.map(s => ({
    context_id: contextId,
    instrument_id: s.instrument_id,
    student_id: s.student_id,
    plan_ce_id: s.plan_ce_id || null,
    score_value: s.score_value,
  }));

  const { error } = await supabase
    .from("instrument_student_scores")
    .upsert(rows, { onConflict: "context_id,instrument_id,student_id,plan_ce_key" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: null };
}

export async function getScoresForContext(contextId: string): Promise<ActionResponse<InstrumentScore[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("instrument_student_scores")
    .select("*")
    .eq("context_id", contextId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []) as InstrumentScore[] };
}

export async function getTrimesterLocks(contextId: string): Promise<ActionResponse<EvaluationTrimesterLocks>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_trimester_locks")
    .select("*")
    .eq("context_id", contextId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (data) return { ok: true, data: data as EvaluationTrimesterLocks };

  const updatedByProfileId = await resolveUpdatedByProfileId(supabase);
  const { data: inserted, error: insertError } = await supabase
    .from("evaluation_trimester_locks")
    .insert({
      context_id: contextId,
      updated_by_profile_id: updatedByProfileId,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message || "No se pudo inicializar el estado de cierres." };
  }
  return { ok: true, data: inserted as EvaluationTrimesterLocks };
}

export async function updateTrimesterLock(payload: {
  context_id: string;
  trimester_key: TrimesterKey;
  closed: boolean;
}): Promise<ActionResponse<EvaluationTrimesterLocks>> {
  const validated = updateTrimesterLockSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos inv?lidos" };

  const supabase = await createClient();
  const current = await getTrimesterLocks(validated.data.context_id);
  if (!current.ok) return current;

  const fieldName =
    validated.data.trimester_key === "T1"
      ? "t1_auto_closed"
      : validated.data.trimester_key === "T2"
        ? "t2_auto_closed"
        : "t3_auto_closed";

  if (validated.data.closed) {
    const gradesResult = await computeStudentGrades(validated.data.context_id, {
      ignoreTrimesterLocks: true,
    });

    if (!gradesResult.ok) {
      return { ok: false, error: gradesResult.error };
    }

    const snapshotRows = gradesResult.data.studentGrades.map((student) => {
      const trimester = student.trimesterGrades.find(t => t.key === validated.data.trimester_key);
      return {
        context_id: validated.data.context_id,
        student_id: student.studentId,
        trimester_key: validated.data.trimester_key,
        auto_grade: trimester?.autoGrade ?? null,
        completion_percent: trimester?.autoCompletionPercent ?? 0,
        captured_at: new Date().toISOString(),
      };
    });

    if (snapshotRows.length > 0) {
      const { error: snapshotError } = await supabase
        .from("evaluation_trimester_auto_snapshots")
        .upsert(snapshotRows, { onConflict: "context_id,student_id,trimester_key" });

      if (snapshotError) {
        return { ok: false, error: snapshotError.message };
      }
    }
  }

  const updatedByProfileId = await resolveUpdatedByProfileId(supabase);
  const { data, error } = await supabase
    .from("evaluation_trimester_locks")
    .update({
      [fieldName]: validated.data.closed,
      updated_by_profile_id: updatedByProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("context_id", validated.data.context_id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${validated.data.context_id}`);
  return { ok: true, data: data as EvaluationTrimesterLocks };
}

export async function getTrimesterAdjustedOverrides(
  contextId: string
): Promise<ActionResponse<EvaluationTrimesterAdjustedOverride[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_trimester_adjusted_overrides")
    .select("*")
    .eq("context_id", contextId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []) as EvaluationTrimesterAdjustedOverride[] };
}

export async function getTrimesterAutoSnapshots(
  contextId: string
): Promise<ActionResponse<EvaluationTrimesterAutoSnapshot[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_trimester_auto_snapshots")
    .select("*")
    .eq("context_id", contextId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []) as EvaluationTrimesterAutoSnapshot[] };
}

export async function upsertTrimesterAdjustedOverride(payload: {
  context_id: string;
  student_id: string;
  trimester_key: TrimesterKey;
  adjusted_grade: number;
}): Promise<ActionResponse<EvaluationTrimesterAdjustedOverride>> {
  const validated = upsertTrimesterAdjustedOverrideSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos invÃ¡lidos" };

  const supabase = await createClient();
  const updatedByProfileId = await resolveUpdatedByProfileId(supabase);
  const { data, error } = await supabase
    .from("evaluation_trimester_adjusted_overrides")
    .upsert(
      {
        ...validated.data,
        updated_by_profile_id: updatedByProfileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "context_id,student_id,trimester_key" }
    )
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${validated.data.context_id}`);
  return { ok: true, data: data as EvaluationTrimesterAdjustedOverride };
}

export async function getRAManualOverrides(
  contextId: string
): Promise<ActionResponse<EvaluationRAManualOverride[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_ra_manual_overrides")
    .select("*")
    .eq("context_id", contextId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []) as EvaluationRAManualOverride[] };
}

export async function upsertRAManualOverride(payload: {
  context_id: string;
  student_id: string;
  plan_ra_id: string;
  improved_grade: number;
}): Promise<ActionResponse<EvaluationRAManualOverride>> {
  const validated = upsertRAManualOverrideSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos invÃ¡lidos" };

  const supabase = await createClient();
  const updatedByProfileId = await resolveUpdatedByProfileId(supabase);
  const { data, error } = await supabase
    .from("evaluation_ra_manual_overrides")
    .upsert(
      {
        ...validated.data,
        updated_by_profile_id: updatedByProfileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "context_id,student_id,plan_ra_id" }
    )
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${validated.data.context_id}`);
  return { ok: true, data: data as EvaluationRAManualOverride };
}

export async function getFinalManualOverrides(
  contextId: string
): Promise<ActionResponse<EvaluationFinalManualOverride[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_final_manual_overrides")
    .select("*")
    .eq("context_id", contextId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []) as EvaluationFinalManualOverride[] };
}

export async function upsertFinalManualOverride(payload: {
  context_id: string;
  student_id: string;
  improved_final_grade: number;
}): Promise<ActionResponse<EvaluationFinalManualOverride>> {
  const validated = upsertFinalManualOverrideSchema.safeParse(payload);
  if (!validated.success) return { ok: false, error: "Datos invÃ¡lidos" };

  const supabase = await createClient();
  const updatedByProfileId = await resolveUpdatedByProfileId(supabase);
  const { data, error } = await supabase
    .from("evaluation_final_manual_overrides")
    .upsert(
      {
        ...validated.data,
        updated_by_profile_id: updatedByProfileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "context_id,student_id" }
    )
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${validated.data.context_id}`);
  return { ok: true, data: data as EvaluationFinalManualOverride };
}

export async function deleteTrimesterAdjustedOverride(payload: {
  context_id: string;
  student_id: string;
  trimester_key: TrimesterKey;
}): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_trimester_adjusted_overrides")
    .delete()
    .eq("context_id", payload.context_id)
    .eq("student_id", payload.student_id)
    .eq("trimester_key", payload.trimester_key);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${payload.context_id}`);
  return { ok: true, data: null };
}

export async function deleteRAManualOverride(payload: {
  context_id: string;
  student_id: string;
  plan_ra_id: string;
}): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_ra_manual_overrides")
    .delete()
    .eq("context_id", payload.context_id)
    .eq("student_id", payload.student_id)
    .eq("plan_ra_id", payload.plan_ra_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${payload.context_id}`);
  return { ok: true, data: null };
}

export async function deleteFinalManualOverride(payload: {
  context_id: string;
  student_id: string;
}): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_final_manual_overrides")
    .delete()
    .eq("context_id", payload.context_id)
    .eq("student_id", payload.student_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${payload.context_id}`);
  return { ok: true, data: null };
}

/**
 * Borra todas las notas de instrumentos estándar (no PRI/PMI) de un contexto de evaluación.
 * No afecta a overrides manuales ni a notas calculadas.
 */
export async function clearAllInstrumentScores(contextId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // Obtener los IDs de instrumentos no-PRI/PMI vinculados a este contexto
  const { data: modules } = await supabase
    .from("evaluation_context_modules")
    .select("teaching_plan_id")
    .eq("context_id", contextId);

  if (!modules || modules.length === 0) return { ok: true, data: null };

  const planIds = modules.map((m: any) => m.teaching_plan_id);

  const { data: instruments } = await supabase
    .from("plan_instruments")
    .select("id")
    .in("plan_id", planIds)
    .eq("is_pri_pmi", false);

  if (!instruments || instruments.length === 0) return { ok: true, data: null };

  const instrumentIds = instruments.map((i: any) => i.id);

  const { error } = await supabase
    .from("instrument_student_scores")
    .delete()
    .eq("context_id", contextId)
    .in("instrument_id", instrumentIds);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId}`);
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function resolveUpdatedByProfileId(supabase: any): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function contextId_from_student(
  supabase: any,
  studentId: string
): Promise<string> {
  const { data } = await supabase
    .from("evaluation_students")
    .select("context_id")
    .eq("id", studentId)
    .single();
  return data?.context_id || "";
}

// ─────────────────────────────────────────────
// GRADE COMPUTATION
// ─────────────────────────────────────────────

export async function computeStudentGrades(
  contextId: string,
  options?: {
    plans?: TeachingPlanFull[];
    scores?: InstrumentScore[];
    ignoreTrimesterLocks?: boolean;
  }
): Promise<ActionResponse<GradeComputationResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // 1. Get context
  const ctxResult = await getEvaluationContext(contextId);
  if (!ctxResult.ok) return ctxResult;
  const context = ctxResult.data;

  // 2. Use provided plans or fetch linked plans
  const planCache = options?.plans;
  const plans: TeachingPlanFull[] = [];
  if (planCache && planCache.length > 0) {
    plans.push(...planCache);
  }
  const existingPlanIds = new Set(plans.map(p => p.id));
  for (const planId of context.plan_ids || []) {
    if (existingPlanIds.has(planId)) continue;
    const planResult = await getPlan(planId);
    if (planResult.ok) plans.push(planResult.data);
  }

  // 3. Get all scores (use provided if available)
  let scores = options?.scores;
  if (!scores) {
    const scoresResult = await getScoresForContext(contextId);
    if (!scoresResult.ok) return scoresResult;
    scores = scoresResult.data;
  }

  // 4. Load lock and override sources
  const [locksResult, snapshotsResult, trimesterOverridesResult, raOverridesResult, finalOverridesResult] = await Promise.all([
    getTrimesterLocks(contextId),
    getTrimesterAutoSnapshots(contextId),
    getTrimesterAdjustedOverrides(contextId),
    getRAManualOverrides(contextId),
    getFinalManualOverrides(contextId),
  ]);

  if (!locksResult.ok) return locksResult;
  if (!snapshotsResult.ok) return snapshotsResult;
  if (!trimesterOverridesResult.ok) return trimesterOverridesResult;
  if (!raOverridesResult.ok) return raOverridesResult;
  if (!finalOverridesResult.ok) return finalOverridesResult;

  // 5. Compute
  const result = computeAllStudentGrades(context, plans, scores, {
    trimesterLocks: locksResult.data,
    trimesterAutoSnapshots: snapshotsResult.data,
    trimesterAdjustedOverrides: trimesterOverridesResult.data,
    raManualOverrides: raOverridesResult.data,
    finalManualOverrides: finalOverridesResult.data,
    ignoreTrimesterLocks: options?.ignoreTrimesterLocks,
  });

  return { ok: true, data: result };
}
