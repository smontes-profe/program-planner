/**
 * Helpers for parsing imported CSV headers.
 */

import type { TeachingPlanFull } from "@/domain/teaching-plan/types";

export interface ParsedInstrumentHeader {
  instrumentId: string;
  code: string;
  label: string;
  maxPoints: number | null;
}

export interface InstrumentHeaderMaps {
  byCode: Map<string, NonNullable<TeachingPlanFull["instruments"]>[number]>;
  byId: Map<string, NonNullable<TeachingPlanFull["instruments"]>[number]>;
}

export function createInstrumentHeaderMaps(plans: TeachingPlanFull[]): InstrumentHeaderMaps {
  const allInstruments = plans.flatMap(plan => plan.instruments || []).filter(instrument => !instrument.is_pri_pmi);
  const byCode = new Map(
    allInstruments
      .filter(instrument => instrument.code)
      .map(instrument => [instrument.code!.trim(), instrument])
  );
  const byId = new Map(allInstruments.map(instrument => [instrument.id, instrument]));

  return { byCode, byId };
}

function normalizeHeaderLabel(rawLabel: string): string {
  return rawLabel.trim().replace(/\s+/g, " ");
}

function extractInstrumentCode(rawLabel: string): string | null {
  const normalized = normalizeHeaderLabel(rawLabel).split("|")[0].trim();

  const codeMatch = normalized.match(/^([A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)\s*[:.-]?\s*/);
  if (codeMatch) return codeMatch[1];

  return null;
}

export function resolveInstrumentHeader(
  rawLabel: string,
  maps: InstrumentHeaderMaps
): ParsedInstrumentHeader | null {
  const { byCode, byId } = maps;
  const normalized = normalizeHeaderLabel(rawLabel);
  const labelPart = normalized.split("|")[0].trim();

  const idMatch = normalized.match(/\|([A-Za-z0-9-]+)$/);
  if (idMatch && byId.has(idMatch[1])) {
    const instrument = byId.get(idMatch[1])!;
    return {
      instrumentId: instrument.id,
      code: instrument.code || extractInstrumentCode(labelPart) || "??",
      label: labelPart,
      maxPoints: parseMaxPoints(normalized),
    };
  }

  const code = extractInstrumentCode(labelPart);
  if (!code) return null;

  const instrument = byCode.get(code);
  if (!instrument) return null;

  return {
    instrumentId: instrument.id,
    code: instrument.code || code,
    label: labelPart,
    maxPoints: parseMaxPoints(normalized),
  };
}

export function parseMaxPoints(rawLabel: string): number | null {
  const maxMatch = rawLabel.match(/Puntos totales:\s*([0-9]+(?:[.,][0-9]+)?)/i);
  return maxMatch ? Number(maxMatch[1].replace(",", ".")) : null;
}
