"use client";

import { useState, useTransition, Fragment } from "react";
import { type TeachingPlanFull, type PlanRA } from "@/domain/teaching-plan/types";
import { updatePlanRAConfig, toggleCeWeightAuto, updateCeWeightsForRA } from "@/domain/teaching-plan/actions";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComputedWeightsPanel } from "./ComputedWeightsPanel";

interface WeightsTabProps {
  readonly plan: TeachingPlanFull;
  readonly readOnly?: boolean;
}

type Trimester = "t1" | "t2" | "t3";
const TRIMESTERS: { key: Trimester; label: string }[] = [
  { key: "t1", label: "T1" },
  { key: "t2", label: "T2" },
  { key: "t3", label: "T3" },
];

// ─── Computed Trimester Weights ──────────────────────────────────────────────
function computeTrimesterWeight(ras: PlanRA[], raId: string, trimester: Trimester): number | null {
  const activeKey = `active_${trimester}` as keyof PlanRA;
  const ra = ras.find((r) => r.id === raId);
  if (!ra || !ra[activeKey]) return null;

  const activeRAs = ras.filter((r) => r[activeKey]);
  const totalGlobal = activeRAs.reduce((sum, r) => sum + (Number(r.weight_global) || 0), 0);
  if (totalGlobal === 0) return null;

  return (Number(ra.weight_global) / totalGlobal) * 100;
}

// ─── Global Weight Input ─────────────────────────────────────────────────────
interface GlobalWeightInputProps {
  readonly planId: string;
  readonly ra: PlanRA;
  readonly readOnly?: boolean;
}

function GlobalWeightInput({ planId, ra, readOnly = false }: GlobalWeightInputProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState(String(Number(ra.weight_global) || 0));

  function handleBlur() {
    if (readOnly) return;
    const num = Number.parseFloat(localValue);
    if (Number.isNaN(num) || num === Number(ra.weight_global)) return;
    const clamped = Math.min(100, Math.max(0, num));
    setLocalValue(String(clamped));

    startTransition(async () => {
      await updatePlanRAConfig(planId, ra.id, {
        weight_global: clamped,
        active_t1: ra.active_t1,
        active_t2: ra.active_t2,
        active_t3: ra.active_t3,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        value={localValue}
        disabled={readOnly}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className={cn(
          "w-20 rounded-md border px-2 py-1.5 text-right text-sm font-mono",
          "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
          "focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-shadow"
        )}
      />
      <span className="text-zinc-400 text-xs">%</span>
    </div>
  );
}

// ─── Trimester Cell ──────────────────────────────────────────────────────────
interface TrimesterCellProps {
  readonly planId: string;
  readonly ra: PlanRA;
  readonly trimester: Trimester;
  readonly computedWeight: number | null;
  readonly readOnly?: boolean;
}

function TrimesterCell({ planId, ra, trimester, computedWeight, readOnly = false }: TrimesterCellProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const activeKey = `active_${trimester}` as "active_t1" | "active_t2" | "active_t3";
  const isActive = ra[activeKey];

  function handleChange(checked: boolean) {
    if (readOnly) return;
    startTransition(async () => {
      await updatePlanRAConfig(planId, ra.id, {
        weight_global: Number(ra.weight_global) || 0,
        active_t1: trimester === "t1" ? checked : ra.active_t1,
        active_t2: trimester === "t2" ? checked : ra.active_t2,
        active_t3: trimester === "t3" ? checked : ra.active_t3,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <label className="flex items-center gap-1.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={isActive}
          disabled={readOnly}
          onChange={(e) => handleChange(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 accent-emerald-600 cursor-pointer"
        />
      </label>
      {isActive && computedWeight !== null ? (
        <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          {computedWeight.toFixed(1)}%
        </span>
      ) : (
        <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
      )}
    </div>
  );
}

// ─── Column status indicator ─────────────────────────────────────────────────
function GlobalTotal({ total }: { readonly total: number }) {
  const isOk = Math.abs(total - 100) < 0.1;
  const isEmpty = total === 0;

  let colorClass = "text-zinc-400";
  if (isOk) colorClass = "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
  else if (!isEmpty) colorClass = "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";

  return (
    <div className={cn("flex items-center gap-1.5 justify-end text-sm font-bold px-2 py-1 rounded-md", colorClass)}>
      {isOk && <CheckCircle2 className="h-3.5 w-3.5" />}
      {!isOk && !isEmpty && <AlertTriangle className="h-3.5 w-3.5" />}
      {total.toFixed(1)}%
    </div>
  );
}

// ─── CE Weight editor for automation ─────────────────────────────────────────
function CeWeightRow({ planId, ra, autoEnabled, readOnly = false }: {
  readonly planId: string;
  readonly ra: PlanRA;
  readonly autoEnabled: boolean;
  readonly readOnly?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [localWeights, setLocalWeights] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const ce of ra.ces || []) {
      initial[ce.id] = String(Number(ce.weight_in_ra) || 0);
    }
    return initial;
  });

  const ces = ra.ces || [];
  if (ces.length === 0) return null;

  const totalCeWeight = Object.values(localWeights).reduce((sum, v) => sum + (Number.parseFloat(v) || 0), 0);
  const isValid = Math.abs(totalCeWeight - 100) < 0.1;

  async function handleSave() {
    if (readOnly) return;
    setIsPending(true);
    setError("");
    const ceWeights = ces.map(ce => ({
      ceId: ce.id,
      weightInRa: Number.parseFloat(localWeights[ce.id] || "0") || 0
    }));

    const res = await updateCeWeightsForRA(planId, ra.id, ceWeights);
    setIsPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  if (!autoEnabled) return null;

  return (
    <tr>
      <td colSpan={5} className="px-4 pb-3">
        <div className="ml-4 border-l-2 border-emerald-200 dark:border-emerald-800 pl-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors mb-1"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Pesos de CEs ({ces.length} criterios)
            {isValid && <CheckCircle2 className="h-3 w-3 ml-1 text-emerald-500" />}
            {!isValid && totalCeWeight > 0 && <AlertTriangle className="h-3 w-3 ml-1 text-amber-500" />}
          </button>

          {expanded && (
            <div className="space-y-2 mt-2">
              {ces.map(ce => (
                <div key={ce.id} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-bold text-zinc-500 w-6">{ce.code})</span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 flex-1 truncate">
                    {ce.description}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={localWeights[ce.id] || ""}
                      disabled={readOnly}
                      onChange={(e) => setLocalWeights(prev => ({ ...prev, [ce.id]: e.target.value }))}
                      className={cn(
                        "w-16 h-7 rounded border px-2 text-right text-xs font-mono",
                        "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
                        "focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      )}
                      placeholder="0"
                    />
                    <span className="text-[10px] text-zinc-400">%</span>
                  </div>
                </div>
              ))}

              {/* Total + Save */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className={cn(
                  "text-xs font-bold",
                  isValid ? "text-emerald-600" : totalCeWeight > 0 ? "text-amber-600" : "text-zinc-400"
                )}>
                  Total: {totalCeWeight.toFixed(2)}%
                  {isValid && " ✓"}
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending || !isValid || readOnly}
                  className={cn(
                    "text-xs px-3 py-1 rounded-md font-medium transition-colors",
                    isValid
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  )}
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar pesos"}
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Automation Toggle ───────────────────────────────────────────────────────
function AutomationToggle({ planId, enabled, readOnly = false }: { readonly planId: string; readonly enabled: boolean; readonly readOnly?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (readOnly) return;
    startTransition(async () => {
      await toggleCeWeightAuto(planId, !enabled);
      router.refresh();
    });
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors",
      enabled
        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
        : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          enabled ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-zinc-100 dark:bg-zinc-800"
        )}>
          <Zap className={cn(
            "h-5 w-5",
            enabled ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"
          )} />
        </div>
        <div>
          <h4 className={cn(
            "text-sm font-semibold",
            enabled ? "text-emerald-900 dark:text-emerald-300" : "text-zinc-700 dark:text-zinc-300"
          )}>
            Automatizar pesos de CEs
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed max-w-xl">
            Cuando está activado, defines una vez el reparto de pesos de cada CE dentro de su RA.
            Los instrumentos que cubran ese RA heredarán automáticamente esos porcentajes.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending || readOnly}
        role="switch"
        aria-checked={enabled}
        aria-label="Automatizar pesos de CEs"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          enabled ? "bg-emerald-600" : "bg-zinc-200 dark:bg-zinc-700",
          isPending && "opacity-50"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function WeightsTab({ plan, readOnly = false }: WeightsTabProps) {
  const ras = plan.ras ?? [];

  if (ras.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400 text-sm">
        <p>Primero añade RAs en la pestaña <strong>Currículo</strong> para poder asignar pesos.</p>
      </div>
    );
  }

  const totalGlobal = ras.reduce((sum, ra) => sum + (Number(ra.weight_global) || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Resumen de Pesos</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Asigna el peso global de cada RA (debe sumar <strong>100%</strong>) y marca en qué trimestres se imparte.
          El porcentaje por trimestre se calcula automáticamente.
        </p>
      </div>

      {/* Automation toggle */}
      <AutomationToggle planId={plan.id} enabled={plan.ce_weight_auto} readOnly={readOnly} />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400 w-full">
                Resultado de Aprendizaje
              </th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap min-w-[120px]">
                Global
              </th>
              {TRIMESTERS.map((t) => (
                <th
                  key={t.key}
                  className="text-center px-6 py-3 font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap min-w-[90px]"
                >
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {ras.map((ra) => (
              <Fragment key={ra.id}>
                <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-zinc-400 text-xs shrink-0">RA {ra.code}</span>
                      <span className="text-zinc-700 dark:text-zinc-300 text-xs leading-snug line-clamp-2">
                        {ra.description}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <GlobalWeightInput planId={plan.id} ra={ra} readOnly={readOnly} />
                  </td>
                  {TRIMESTERS.map((t) => (
                    <td key={t.key} className="px-4 py-3 text-center">
                      <TrimesterCell
                        planId={plan.id}
                        ra={ra}
                        trimester={t.key}
                        computedWeight={computeTrimesterWeight(ras, ra.id, t.key)}
                        readOnly={readOnly}
                      />
                    </td>
                  ))}
                </tr>
                {/* CE weight sub-rows when automation is enabled */}
                <CeWeightRow
                  planId={plan.id}
                  ra={ra}
                  autoEnabled={plan.ce_weight_auto}
                  readOnly={readOnly}
                />
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/60">
              <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
                Total Global
              </td>
              <td className="px-4 py-3 text-right">
                <GlobalTotal total={totalGlobal} />
              </td>
              {TRIMESTERS.map((t) => {
                const activeKey = `active_${t.key}` as keyof PlanRA;
                const activeCount = ras.filter((ra) => ra[activeKey]).length;
                return (
                  <td key={t.key} className="px-4 py-3 text-center">
                    <span className={cn(
                      "text-xs font-medium",
                      activeCount > 0 ? "text-zinc-500" : "text-zinc-300 dark:text-zinc-600"
                    )}>
                      {activeCount > 0 ? `${activeCount} RA${activeCount > 1 ? "s" : ""}` : "—"}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-zinc-400 italic">
        💡 Marca los trimestres en los que se imparte cada RA. El porcentaje por trimestre indica cuánto
        peso tiene ese RA <em>dentro de ese trimestre</em>, calculado proporcionalmente respecto a los
        otros RAs activos en él.
      </p>

      {/* Computed weights: target vs. real coverage from instruments */}
      <ComputedWeightsPanel plan={plan} />
    </div>
  );
}
