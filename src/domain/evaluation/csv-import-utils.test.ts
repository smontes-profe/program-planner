import { describe, expect, it } from "vitest";
import { createInstrumentHeaderMaps, resolveInstrumentHeader } from "./csv-import-utils";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";

function makePlan(): TeachingPlanFull {
  return {
    id: "plan-1",
    organization_id: "org-1",
    owner_profile_id: "profile-1",
    source_plan_id: null,
    source_template_id: null,
    source_version: null,
    title: "Plan de prueba",
    region_code: "AND",
    module_code: "DAW01",
    academic_year: "2025/2026",
    visibility_scope: "private",
    status: "draft",
    hours_total: 100,
    ce_weight_auto: false,
    imported_at: null,
    created_at: "2025-01-01T00:00:00Z",
    ras: [],
    instruments: [
      {
        id: "inst-pt2",
        plan_id: "plan-1",
        code: "PT2",
        type: "project",
        is_pri_pmi: false,
        ce_weight_auto: true,
        name: "Proyecto Intermodular",
        description: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ],
  };
}

describe("csv-import-utils", () => {
  it("resuelve cabeceras con código seguido de dos puntos", () => {
    const maps = createInstrumentHeaderMaps([makePlan()]);
    const resolved = resolveInstrumentHeader(
      "PT2: Proyecto Intermodular [Puntos totales: 100 Puntuación] |444848",
      maps
    );

    expect(resolved?.instrumentId).toBe("inst-pt2");
    expect(resolved?.code).toBe("PT2");
    expect(resolved?.label).toBe("PT2: Proyecto Intermodular [Puntos totales: 100 Puntuación]");
    expect(resolved?.maxPoints).toBe(100);
  });
});
