/**
 * Compute target vs. real (instrument-derived) effective weights per RA.
 *
 * - **Target weight** = the RA's `weight_global` (what the teacher intends this RA contributes to the final grade).
 * - **Coverage %** = average of all instrument `coverage_percent` that touch this RA.
 *   Shows how much of the RA's content is actually being assessed by instruments.
 * - **Effective weight** = targetWeight × (coverage% / 100).
 *   The real contribution of this RA to the final grade based on what instruments cover.
 * - **Gap** = targetWeight - effectiveWeight. Positive means part of the RA is NOT being assessed.
 *
 * Example: RA with weight_global=20% and coverage=75% → effective weight = 15%, gap = 5%.
 * This means 5% of the plan's weight corresponds to RA content that no instrument evaluates.
 *
 * Per-trimester breakdowns normalize the target weight among active RAs in
 * that trimester, and show which instruments (assigned to units in that
 * trimester) cover each RA.
 */

import type { TeachingPlanFull } from "./types";

export interface RAWeightComparison {
  raId: string;
  raCode: string;
  raDescription: string;
  // Global
  targetWeight: number;
  /** Average coverage % across all instruments that touch this RA (0-100+) */
  coveragePercent: number;
  /** targetWeight × (coveragePercent / 100) */
  effectiveWeight: number;
  /** targetWeight - effectiveWeight */
  gap: number;
  // Per trimester
  trimesters: {
    key: "T1" | "T2" | "T3";
    /** Normalized target weight among active RAs in this trimester */
    targetNormalized: number | null;
    /** Coverage % from instruments in this trimester only */
    coveragePercent: number;
    /** Effective weight in this trimester */
    effectiveWeight: number | null;
    /** Instruments assigned to units in this trimester that cover this RA */
    instrumentCount: number;
    instrumentNames: string[];
  }[];
}

/**
 * Compute weight comparison for all RAs in a plan.
 * Returns an array of RAWeightComparison, one per RA.
 */
export function computeRAWeightComparison(plan: TeachingPlanFull): RAWeightComparison[] {
  const ras = plan.ras ?? [];
  const units = plan.units ?? [];
  const instruments = plan.instruments ?? [];

  // Build unit → trimester map
  const unitTrimesters = new Map<string, Set<"T1" | "T2" | "T3">>();
  for (const unit of units) {
    const trimesters = new Set<"T1" | "T2" | "T3">();
    if (unit.active_t1) trimesters.add("T1");
    if (unit.active_t2) trimesters.add("T2");
    if (unit.active_t3) trimesters.add("T3");
    unitTrimesters.set(unit.id, trimesters);
  }

  // Build RA → instrument coverage map
  // For each RA, collect all coverage_percent values from instruments
  const raCoverageValues = new Map<string, number[]>();
  const raInstruments = new Map<string, { name: string; unitIds: string[] }[]>();

  for (const instrument of instruments) {
    const coverages = instrument.ra_coverages ?? [];
    const unitIds = instrument.unit_ids ?? [];
    for (const cov of coverages) {
      const values = raCoverageValues.get(cov.plan_ra_id) ?? [];
      values.push(Number(cov.coverage_percent));
      raCoverageValues.set(cov.plan_ra_id, values);

      const instList = raInstruments.get(cov.plan_ra_id) ?? [];
      instList.push({ name: `${instrument.code} - ${instrument.name}`, unitIds });
      raInstruments.set(cov.plan_ra_id, instList);
    }
  }

  return ras.map((ra) => {
    const targetWeight = Number(ra.weight_global) || 0;
    const coverageValues = raCoverageValues.get(ra.id) ?? [];

    // Coverage % = average of all instrument coverage values for this RA.
    // If no instruments touch this RA, coverage is 0%.
    const coveragePercent = coverageValues.length > 0
      ? coverageValues.reduce((sum, v) => sum + v, 0) / coverageValues.length
      : 0;

    // Effective weight = what this RA actually contributes to the final grade
    // based on how much instruments cover it.
    const effectiveWeight = targetWeight * (coveragePercent / 100);
    const gap = targetWeight - effectiveWeight;

    // Compute per-trimester breakdowns
    const trimesters: RAWeightComparison["trimesters"] = ["T1", "T2", "T3"].map((triKey) => {
      const activeKey = triKey === "T1" ? "active_t1" : triKey === "T2" ? "active_t2" : "active_t3";

      // Check if this RA is active in this trimester
      if (!ra[activeKey]) {
        return {
          key: triKey as "T1" | "T2" | "T3",
          targetNormalized: null,
          coveragePercent: 0,
          effectiveWeight: null,
          instrumentCount: 0,
          instrumentNames: [],
        };
      }

      // Compute normalized target weight for this trimester
      const activeRAs = ras.filter((r) => r[activeKey]);
      const activeTotal = activeRAs.reduce((sum, r) => sum + (Number(r.weight_global) || 0), 0);
      const targetNormalized =
        activeTotal > 0 ? (targetWeight / activeTotal) * 100 : null;

      // Find instruments in this trimester that cover this RA
      const instList = raInstruments.get(ra.id) ?? [];
      const triInstruments = instList.filter((inst) =>
        inst.unitIds.some((uid) => {
          const triSet = unitTrimesters.get(uid);
          return triSet?.has(triKey as "T1" | "T2" | "T3");
        })
      );

      // Coverage % from instruments in this trimester only
      const triCoverageValues = triInstruments.map((inst) => {
        const instData = instruments.find((i) => `${i.code} - ${i.name}` === inst.name);
        const cov = instData?.ra_coverages?.find((c) => c.plan_ra_id === ra.id);
        return cov ? Number(cov.coverage_percent) : 0;
      }).filter((v) => v > 0);

      const triCoveragePercent = triCoverageValues.length > 0
        ? triCoverageValues.reduce((sum, v) => sum + v, 0) / triCoverageValues.length
        : 0;

      const triEffectiveWeight = targetNormalized !== null
        ? targetNormalized * (triCoveragePercent / 100)
        : null;

      return {
        key: triKey as "T1" | "T2" | "T3",
        targetNormalized,
        coveragePercent: triCoveragePercent,
        effectiveWeight: triEffectiveWeight,
        instrumentCount: triInstruments.length,
        instrumentNames: triInstruments.map((i) => i.name),
      };
    });

    return {
      raId: ra.id,
      raCode: ra.code,
      raDescription: ra.description,
      targetWeight,
      coveragePercent,
      effectiveWeight,
      gap,
      trimesters,
    };
  });
}
