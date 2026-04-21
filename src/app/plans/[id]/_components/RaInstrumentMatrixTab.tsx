"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { updatePlanInstrumentRaCoverage } from "@/domain/teaching-plan/matrix-actions";
import { type TeachingPlanFull } from "@/domain/teaching-plan/types";
import { cn } from "@/lib/utils";

interface RaInstrumentMatrixTabProps {
  readonly plan: TeachingPlanFull;
}

interface CoverageCellEditorProps {
  readonly planId: string;
  readonly instrumentId: string;
  readonly raId: string;
  readonly raCode: string;
  readonly instrumentCode: string;
  readonly initialValue: number;
  readonly autoEnabled: boolean;
}

function formatCoverageValue(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

function CoverageCellEditor({
  planId,
  instrumentId,
  raId,
  raCode,
  instrumentCode,
  initialValue,
  autoEnabled,
}: CoverageCellEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(formatCoverageValue(initialValue));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(formatCoverageValue(initialValue));
    setError("");
  }, [initialValue]);

  async function commitValue(nextValue: string) {
    const normalized = nextValue.replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    if (Number.isNaN(parsed)) {
      setError("Valor no valido");
      return;
    }

    const clamped = Math.min(100, Math.max(0, parsed));
    const rounded = Number(clamped.toFixed(2));

    if (Math.abs(rounded - initialValue) < 0.0001) {
      setError("");
      return;
    }

    setIsSaving(true);
    setError("");

    let res;
    try {
      res = await updatePlanInstrumentRaCoverage(planId, instrumentId, raId, {
        coverage_percent: rounded,
      });
    } finally {
      setIsSaving(false);
    }

    if (res?.ok) {
      router.refresh();
      return;
    }

    setError(res?.error || "No se pudo guardar la cobertura");
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Input
        type="number"
        min={0}
        max={100}
        step={0.01}
        inputMode="decimal"
        value={value}
        disabled={isSaving}
        aria-label={`Cobertura del RA ${raCode} en ${instrumentCode}`}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-7 w-[72px] text-right text-xs font-mono",
          error && "border-rose-400 text-rose-700 dark:border-rose-500"
        )}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError("");
        }}
        onBlur={() => {
          void commitValue(value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.currentTarget as HTMLInputElement).blur();
          }
          if (event.key === "Escape") {
            setValue(formatCoverageValue(initialValue));
            setError("");
            event.currentTarget.blur();
          }
        }}
      />
      {error ? (
        <span className="max-w-[88px] truncate text-[9px] text-rose-500" title={error}>
          {error}
        </span>
      ) : (
        <span className="text-[9px] text-zinc-400">{isSaving ? "Guardando..." : autoEnabled ? "auto" : "manual"}</span>
      )}
    </div>
  );
}

export function RaInstrumentMatrixTab({ plan }: RaInstrumentMatrixTabProps) {
  const ras = plan.ras || [];
  const instruments = (plan.instruments || []).filter((i) => !i.is_pri_pmi);

  if (ras.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        No hay Resultados de Aprendizaje definidos en esta programacion.
      </div>
    );
  }

  if (instruments.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        No hay instrumentos de evaluacion definidos todavia.
      </div>
    );
  }

  const raRows = ras.map((ra) => {
    const coverageByInstrument = instruments.map((inst) => {
      const rc = (inst.ra_coverages || []).find((r) => r.plan_ra_id === ra.id);
      const percent = rc ? Number(rc.coverage_percent) : 0;
      return { inst, percent };
    });

    const totalCoverage = coverageByInstrument.reduce((sum, { percent }) => sum + percent, 0);
    return { ra, coverageByInstrument, totalCoverage };
  });

  const activeInstruments = instruments.filter((inst) =>
    ras.some((ra) => (inst.ra_coverages || []).some((rc) => rc.plan_ra_id === ra.id && Number(rc.coverage_percent) > 0))
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">RAs vs Instrumentos</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Cobertura de cada Resultado de Aprendizaje por instrumento. El porcentaje indica que parte de la nota del RA aporta cada instrumento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Cobertura total del RA:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            100% - Completo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
            &lt; 100% - Incompleto
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
            &gt; 100% - Exceso
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <th className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3 text-left border-r border-zinc-200 dark:border-zinc-800 min-w-[120px]">
                  RA
                </th>
                <th className="px-3 py-3 text-center border-r border-zinc-200 dark:border-zinc-800 min-w-[90px]">
                  Cobertura
                </th>
                {activeInstruments.map((inst) => (
                  <th key={inst.id} className="px-3 py-3 text-center min-w-[80px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          {inst.code}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs">
                        <p className="font-semibold">{inst.name}</p>
                        {inst.description && <p className="text-zinc-400 mt-0.5">{inst.description}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {raRows.map(({ ra, coverageByInstrument, totalCoverage }) => {
                const isComplete = Math.abs(totalCoverage - 100) < 0.1;
                const isOver = totalCoverage > 100 + 0.1;

                return (
                  <tr key={ra.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="sticky left-0 z-10 bg-white dark:bg-zinc-950 px-4 py-3 border-r border-zinc-200 dark:border-zinc-800">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            RA {ra.code}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px] text-xs">
                          <p className="font-semibold mb-0.5">RA {ra.code}</p>
                          <p className="text-zinc-300">{ra.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>

                    <td className="px-3 py-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
                          isComplete
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : isOver
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        )}
                      >
                        {totalCoverage === 0 ? "0%" : `${totalCoverage % 1 === 0 ? totalCoverage : totalCoverage.toFixed(1)}%`}
                      </span>
                    </td>

                    {activeInstruments.map((inst) => {
                      const entry = coverageByInstrument.find((c) => c.inst.id === inst.id);
                      const percent = entry?.percent ?? 0;

                      return (
                        <td key={inst.id} className="px-3 py-3 text-center align-middle">
                          <CoverageCellEditor
                            planId={plan.id}
                            instrumentId={inst.id}
                            raId={ra.id}
                            raCode={ra.code}
                            instrumentCode={inst.code}
                            initialValue={percent}
                            autoEnabled={plan.ce_weight_auto}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
