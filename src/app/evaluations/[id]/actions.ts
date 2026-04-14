"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { linkTeachingPlan, unlinkTeachingPlan, updateEvaluationContext } from "@/domain/evaluation/actions";

async function handleRedirect(contextId: string, error?: string) {
  revalidatePath(`/evaluations/${contextId}`);
  if (error) {
    redirect(`/evaluations/${contextId}?error=${encodeURIComponent(error)}`);
  }
  redirect(`/evaluations/${contextId}`);
}

export async function updateContextAction(formData: FormData) {
  const contextId = formData.get("context_id") as string | null;
  const title = (formData.get("title") as string | null)?.trim() || "";
  const academic_year = (formData.get("academic_year") as string | null)?.trim() || "";

  if (!contextId || !title || !academic_year) {
    return redirect(`/evaluations/${contextId ?? ""}?error=faltan_campos`);
  }

  const result = await updateEvaluationContext(contextId, { title, academic_year });
  if (!result.ok) {
    await handleRedirect(contextId, result.error);
  } else {
    await handleRedirect(contextId);
  }
}

export async function linkPlanAction(formData: FormData) {
  const contextId = formData.get("context_id") as string | null;
  const planId = formData.get("plan_id") as string | null;
  if (!contextId || !planId) return;

  const result = await linkTeachingPlan(contextId, planId);
  if (!result.ok) {
    await handleRedirect(contextId, result.error);
  } else {
    await handleRedirect(contextId);
  }
}

export async function unlinkPlanAction(formData: FormData) {
  const contextId = formData.get("context_id") as string | null;
  const planId = formData.get("plan_id") as string | null;
  if (!contextId || !planId) return;

  const result = await unlinkTeachingPlan(contextId, planId);
  if (!result.ok) {
    await handleRedirect(contextId, result.error);
  } else {
    await handleRedirect(contextId);
  }
}
