"use client";

import { useState } from "react";
import { type TeachingPlanFull } from "@/domain/teaching-plan/types";
import { computeRAWeightComparison, type RAWeightComparison } from "@/domain/teaching-plan/compute-weights";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComputedWeightsPanelProps {
  readonly plan: TeachingPlanFull;
}

/**
 * Panel that compares each RA's target weight with the effective weight derived from instrument coverage.
 * Shows under-assessed RAs (gap > 0) and per-trimester breakdowns.
 */
export function ComputedWeightsPanel({ plan }: ComputedWeightsPanelProps) {
  const ras = plan.ras ?? [];
  if (ras.length === 0) return null;

  const comparisons = computeRAWeightComparison(plan);

  // Only show panel if there are instruments AND at least one RA has a gap
  const hasInstruments = plan.instruments && plan.instruments.length > 0;
  if (!hasInstruments) return null;

  const hasIssues = comparisons.some(
    (c) => c.coveragePercent === 0 || Math.abs(c.gap) > 0.01
  );

  if (!hasIssues) return null;

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Cobertura real vs. objetivo
        </h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Compara el peso que asignaste a cada RA con cuánto cubren realmente los instrumentos.
        Si la cobertura es inferior al 100%, parte del RA no se está evaluando y su peso efectivo es menor.
      </p>

      {/* Summary table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 w-full min-w-[180px]">
                RA
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">
                Objetivo
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">
                Cobertura
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">
                Peso efectivo
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">
                Desviación
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {comparisons.map((c) => (
              <ComparisonRow key={c.raId} comparison={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Single RA Comparison Row ────────────────────────────────────────────────
function ComparisonRow({ comparison }: { readonly comparison: RAWeightComparison }) {
  const [expanded, setExpanded] = useState(false);

  const { raCode, raDescription, targetWeight, coveragePercent, effectiveWeight, gap } = comparison;
  const hasNoCoverage = coveragePercent === 0;
  const isUnderAssessed = gap > 0.01;
  const isOverAssessed = coveragePercent > 100 && gap < -0.01;

  return (
    <>
      <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-left group"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
            )}
            <span className="font-mono font-bold text-zinc-400 text-xs shrink-0">RA {raCode}</span>
            <span className="text-zinc-700 dark:text-zinc-300 text-xs leading-snug line-clamp-1">
              {raDescription}
            </span>
          </button>
        </td>
        <td className="px-3 py-2.5 text-center font-mono text-sm text-zinc-700 dark:text-zinc-300">
          {targetWeight.toFixed(1)}%
        </td>
        <td className={cn(
          "px-3 py-2.5 text-center font-mono text-sm font-semibold",
          hasNoCoverage
            ? "text-red-600 dark:text-red-400"
            : coveragePercent < 100
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
        )}>
          {coveragePercent.toFixed(1)}%
        </td>
        <td className="px-3 py-2.5 text-center font-mono text-sm text-zinc-700 dark:text-zinc-300">
          {effectiveWeight.toFixed(1)}%
        </td>
        <td className="px-3 py-2.5 text-center">
          <GapIndicator gap={gap} hasNoCoverage={hasNoCoverage} isUnderAssessed={isUnderAssessed} isOverAssessed={isOverAssessed} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-3 pb-3">
            <TrimesterBreakdown comparison={comparison} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Gap Indicator ───────────────────────────────────────────────────────────
function GapIndicator({ gap, hasNoCoverage, isUnderAssessed, isOverAssessed }: {
  gap: number;
  hasNoCoverage: boolean;
  isUnderAssessed: boolean;
  isOverAssessed: boolean;
}) {
  if (hasNoCoverage) {
    return (
      <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
        <MinusCircle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Sin evaluar</span>
      </div>
    );
  }

  if (isUnderAssessed) {
    return (
      <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">-{gap.toFixed(1)}%</span>
      </div>
    );
  }

  if (isOverAssessed) {
    return (
      <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
        <span className="text-xs font-medium">+{Math.abs(gap).toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">OK</span>
    </div>
  );
}

// ─── Trimester Breakdown ─────────────────────────────────────────────────────
function TrimesterBreakdown({ comparison }: { readonly comparison: RAWeightComparison }) {
  const activeTrimesters = comparison.trimesters.filter((t) => t.targetNormalized !== null);
  if (activeTrimesters.length === 0) return null;

  return (
    <div className="ml-4 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 mt-2 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        Desglose por trimestre
      </p>
      {activeTrimesters.map((tri) => (
        <div key={tri.key} className="flex items-center gap-3 text-xs">
          <span className="font-mono font-bold text-zinc-500 w-8 shrink-0">{tri.key}</span>
          <div className="flex-1 grid grid-cols-4 gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase">Objetivo</span>
              <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                {tri.targetNormalized?.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase">Cobertura</span>
              <span className={cn(
                "font-mono font-semibold",
                tri.coveragePercent === 0
                  ? "text-red-600 dark:text-red-400"
                  : tri.coveragePercent < 100
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
              )}>
                {tri.coveragePercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase">Efectivo</span>
              <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                {tri.effectiveWeight?.toFixed(1) ?? "—"}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase">Instrumentos</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {tri.instrumentCount}
              </span>
            </div>
          </div>
          {tri.instrumentNames.length > 0 && (
            <span className="text-[10px] text-zinc-400 italic max-w-[150px] truncate" title={tri.instrumentNames.join(", ")}>
              {tri.instrumentNames.join(", ")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
