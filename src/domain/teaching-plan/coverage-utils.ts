export interface RaCeWeightSource {
  readonly ceId: string;
  readonly weightInRa: number;
  readonly orderIndex?: number | null;
}

export interface CeWeightResult {
  readonly ceId: string;
  readonly weight: number;
}

/**
 * Split a percentage evenly across a list of CEs.
 *
 * The base share is rounded down to the requested precision and the last CE
 * receives the remaining remainder so the total stays exact.
 */
export function splitPercentageEvenly(
  ceIds: readonly string[],
  totalPercent = 100,
  precision = 2
): CeWeightResult[] {
  if (ceIds.length === 0) return [];

  const factor = 10 ** precision;
  const baseShare = Math.floor((totalPercent / ceIds.length) * factor) / factor;
  const baseTotal = baseShare * ceIds.length;
  const remainder = roundTo(totalPercent - baseTotal, precision);

  return ceIds.map((ceId, index) => ({
    ceId,
    weight: index === ceIds.length - 1
      ? roundTo(baseShare + remainder, precision)
      : roundTo(baseShare, precision),
  }));
}

/**
 * Build the CE weights that should be stored after editing an instrument RA
 * coverage from the matrix.
 *
 * - When CE automation is enabled, the coverage is scaled by the CE shares in
 *   the plan RA.
 * - When CE automation is disabled, the RA's CEs are split evenly at 100%.
 */
export function buildMatrixCeWeights(
  ces: readonly RaCeWeightSource[],
  coveragePercent: number,
  autoEnabled: boolean
): CeWeightResult[] {
  const orderedCes = [...ces].sort((a, b) => {
    const left = a.orderIndex ?? 0;
    const right = b.orderIndex ?? 0;
    if (left !== right) return left - right;
    return a.ceId.localeCompare(b.ceId);
  });

  if (orderedCes.length === 0) return [];

  if (!autoEnabled) {
    return splitPercentageEvenly(
      orderedCes.map((ce) => ce.ceId),
      100,
      2
    );
  }

  return orderedCes.map((ce) => ({
    ceId: ce.ceId,
    weight: roundTo((coveragePercent * ce.weightInRa) / 100, 4),
  }));
}

function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
