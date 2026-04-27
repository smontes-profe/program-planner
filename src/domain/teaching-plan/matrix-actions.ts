"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase";

import { buildMatrixCeWeights } from "./coverage-utils";
import { updatePlanInstrumentRaCoverageSchema } from "./schemas";

import type { ActionResponse } from "./actions";

/**
 * Update one RA coverage from the matrix view and keep CE weights in sync.
 */
export async function updatePlanInstrumentRaCoverage(
  planId: string,
  instrumentId: string,
  raId: string,
  payload: { coverage_percent: number }
): Promise<ActionResponse<null>> {
  const validated = updatePlanInstrumentRaCoverageSchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, error: "Datos invÃ¡lidos", details: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from("teaching_plans")
    .select("id, ce_weight_auto")
    .eq("id", planId)
    .single();

  if (planError || !plan) return { ok: false, error: "Plan no encontrado" };

  const { data: ra, error: raError } = await supabase
    .from("plan_ra")
    .select("id")
    .eq("id", raId)
    .eq("plan_id", planId)
    .single();

  if (raError || !ra) {
    return { ok: false, error: "RA no encontrado en esta programaciÃ³n" };
  }

  const { data: instrument, error: instrumentError } = await supabase
    .from("plan_instrument")
    .select("id")
    .eq("id", instrumentId)
    .eq("plan_id", planId)
    .single();

  if (instrumentError || !instrument) {
    return { ok: false, error: "Instrumento no encontrado en esta programaciÃ³n" };
  }

  const { data: ces, error: cesError } = await supabase
    .from("plan_ce")
    .select("id, order_index, weight_in_ra")
    .eq("plan_ra_id", raId)
    .order("order_index", { ascending: true });

  if (cesError) return { ok: false, error: `Error al leer CEs: ${cesError.message}` };

  const coveragePercent = validated.data.coverage_percent;
  const ceWeights = buildMatrixCeWeights(
    (ces ?? []).map((ce) => ({
      ceId: ce.id,
      weightInRa: Number(ce.weight_in_ra) || 0,
      orderIndex: ce.order_index,
    })),
    coveragePercent,
    Boolean(plan.ce_weight_auto)
  );

  const { error: deleteCoverageError } = await supabase
    .from("plan_instrument_ra")
    .delete()
    .eq("instrument_id", instrumentId)
    .eq("plan_ra_id", raId);

  if (deleteCoverageError) {
    return { ok: false, error: `Error al actualizar cobertura del RA: ${deleteCoverageError.message}` };
  }

  if (coveragePercent > 0) {
    const { error: insertCoverageError } = await supabase
      .from("plan_instrument_ra")
      .insert({
        instrument_id: instrumentId,
        plan_ra_id: raId,
        coverage_percent: coveragePercent,
      });

    if (insertCoverageError) {
      return { ok: false, error: `Error al guardar cobertura del RA: ${insertCoverageError.message}` };
    }
  }

  const ceIds = (ces ?? []).map((ce) => ce.id);
  if (ceIds.length > 0) {
    const { error: deleteCeError } = await supabase
      .from("plan_instrument_ce")
      .delete()
      .eq("instrument_id", instrumentId)
      .in("plan_ce_id", ceIds);

    if (deleteCeError) {
      return { ok: false, error: `Error al limpiar pesos de CE: ${deleteCeError.message}` };
    }

    if (coveragePercent > 0 && ceWeights.length > 0) {
      const { error: insertCeError } = await supabase
        .from("plan_instrument_ce")
        .insert(
          ceWeights.map((entry) => ({
            instrument_id: instrumentId,
            plan_ce_id: entry.ceId,
            weight: entry.weight,
          }))
        );

      if (insertCeError) {
        return { ok: false, error: `Error al guardar pesos de CE: ${insertCeError.message}` };
      }
    }
  }

  revalidatePath(`/plans/${planId}`);
  return { ok: true, data: null };
}
