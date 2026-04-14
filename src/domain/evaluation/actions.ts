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
} from "./schemas";
import {
  type EvaluationContext,
  type EvaluationStudent,
  type InstrumentScore,
  type EvaluationContextFull,
  type StudentGradeSummary,
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
      student_count:evaluation_students(count)
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
  payload: { student_name: string; student_email?: string | null }
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
  studentId: string,
  payload: { student_name?: string; student_email?: string | null; active?: boolean }
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
  revalidatePath(`/evaluations/${contextId_from_student(supabase, studentId)}`);
  return { ok: true, data: data as EvaluationStudent };
}

export async function deleteStudent(studentId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_students")
    .delete()
    .eq("id", studentId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/evaluations/${contextId_from_student(supabase, studentId)}`);
  return { ok: true, data: null };
}

export async function bulkImportStudents(
  contextId: string,
  students: { student_name: string; student_email?: string | null }[]
): Promise<ActionResponse<EvaluationStudent[]>> {
  const validated = bulkImportStudentsSchema.safeParse({ students });
  if (!validated.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const rows = students.map(s => ({
    context_id: contextId,
    student_name: s.student_name,
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
      { onConflict: "context_id,instrument_id,student_id,plan_ce_id" }
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
    .upsert(rows, { onConflict: "context_id,instrument_id,student_id,plan_ce_id" });

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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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

export async function computeStudentGrades(contextId: string): Promise<ActionResponse<GradeComputationResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // 1. Get context
  const ctxResult = await getEvaluationContext(contextId);
  if (!ctxResult.ok) return ctxResult;
  const context = ctxResult.data;

  // 2. Get all linked teaching plans
  const plans: TeachingPlanFull[] = [];
  for (const planId of context.plan_ids || []) {
    const planResult = await getPlan(planId);
    if (planResult.ok) plans.push(planResult.data);
  }

  // 3. Get all scores
  const scoresResult = await getScoresForContext(contextId);
  if (!scoresResult.ok) return scoresResult;
  const scores = scoresResult.data;

  // 4. Compute
  const result = computeAllStudentGrades(context, plans, scores);
  return { ok: true, data: result };
}
