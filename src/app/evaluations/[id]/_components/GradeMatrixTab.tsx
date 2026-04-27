"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GradeMatrixCsvImport } from "./GradeMatrixCsvImport";
import { type EvaluationContextFull, type InstrumentScore, type TrimesterKey } from "@/domain/evaluation/types";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";
import { upsertInstrumentScore, clearAllInstrumentScores } from "@/domain/evaluation/actions";

interface GradeMatrixTabProps {
  readonly context: EvaluationContextFull;
  readonly plans: TeachingPlanFull[];
  readonly scores: InstrumentScore[];
  readonly scoreError?: string;
}

const scoreKey = (studentId: string, instrumentId: string) => `${studentId}:${instrumentId}`;

const buildScoreMap = (scores: InstrumentScore[]) => {
  const map: Record<string, string> = {};
  for (const score of scores) {
    const key = scoreKey(score.student_id, score.instrument_id);
    if (map[key] && score.plan_ce_id) continue;
    map[key] = score.score_value !== null ? score.score_value.toString() : "";
  }
  return map;
};

interface InstrumentColumn {
  instrumentId: string;
  instrumentCode: string;
  instrumentName: string;
  trimesters: TrimesterKey[];
}

const COLUMN_SEPARATOR_CLASS = "border-r border-zinc-200 dark:border-zinc-800";

export function GradeMatrixTab({ context, plans, scores, scoreError }: GradeMatrixTabProps) {
  const [scoreValues, setScoreValues] = useState<Record<string, string>>(() => buildScoreMap(scores));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [selectedTrimesters, setSelectedTrimesters] = useState<Set<TrimesterKey>>(new Set(["T1", "T2", "T3"]));
  const [, startTransition] = useTransition();

  useEffect(() => {
    setScoreValues(buildScoreMap(scores));
    setErrors({});
    setClearError(null);
  }, [scores]);

  const studentRows = useMemo(
    () => [...context.students.filter(s => s.active)].sort((a, b) => {
      const lastCmp = (a.last_name ?? "").localeCompare(b.last_name ?? "", undefined, { sensitivity: "base" });
      if (lastCmp !== 0) return lastCmp;
      return (a.student_name ?? "").localeCompare(b.student_name ?? "", undefined, { sensitivity: "base" });
    }),
    [context.students]
  );

  const planGroups = useMemo(() => {
    return plans.map(plan => {
      const units = plan.units || [];
      const columns: InstrumentColumn[] = (plan.instruments || [])
        .filter(instrument => !instrument.is_pri_pmi)
        .map(instrument => {
          // Determine trimesters for this instrument from its units
          const instTrimesters: TrimesterKey[] = [];
          const instUnits = units.filter(u => (instrument.unit_ids || []).includes(u.id));
          if (instUnits.some(u => u.active_t1)) instTrimesters.push("T1");
          if (instUnits.some(u => u.active_t2)) instTrimesters.push("T2");
          if (instUnits.some(u => u.active_t3)) instTrimesters.push("T3");
          
          return {
            instrumentId: instrument.id,
            instrumentCode: instrument.code || instrument.name,
            instrumentName: instrument.name,
            trimesters: instTrimesters,
          };
        })
        .filter(col => {
          if (col.trimesters.length === 0) return true; // Show if no units (fallback)
          return col.trimesters.some(t => selectedTrimesters.has(t));
        });

      return { plan, columns };
    });
  }, [plans, selectedTrimesters]);

  const handleClearAll = async () => {
    if (!confirm("¿Borrar TODAS las notas de instrumentos de todos los alumnos? Esta acción no se puede deshacer. Las notas calculadas (overrides manuales) no se verán afectadas.")) return;
    setIsClearingAll(true);
    setClearError(null);
    try {
      const result = await clearAllInstrumentScores(context.id);
      if (!result.ok) {
        setClearError(result.error);
        return;
      }
      // Limpiar el estado local
      setScoreValues({});
      setErrors({});
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleSave = useCallback(
    (key: string, studentId: string, instrumentId: string) => {
      startTransition(() => {
        (async () => {
          const raw = scoreValues[key] ?? "";
          const normalized = raw.replace(",", ".").trim();
          let value: number | null = null;
          if (normalized !== "") {
            const parsed = Number(normalized);
            if (Number.isNaN(parsed)) {
              setErrors(prev => ({ ...prev, [key]: "Introduce un número válido" }));
              return;
            }
            if (parsed < 0 || parsed > 10) {
              setErrors(prev => ({ ...prev, [key]: "La nota debe estar entre 0 y 10" }));
              return;
            }
            value = parsed;
          }

          setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setPendingKey(key);
          try {
            const result = await upsertInstrumentScore(context.id, {
              instrument_id: instrumentId,
              student_id: studentId,
              plan_ce_id: null,
              score_value: value,
            });
            if (!result.ok) {
              setErrors(prev => ({ ...prev, [key]: result.error }));
              return;
            }
            setScoreValues(prev => ({
              ...prev,
              [key]: value === null ? "" : value.toString(),
            }));
          } finally {
            setPendingKey(null);
          }
        })();
      });
    },
    [context.id, scoreValues, startTransition]
  );

  const renderInstrumentCell = (instrument: InstrumentColumn, studentId: string) => {
    const key = scoreKey(studentId, instrument.instrumentId);
    const value = scoreValues[key] ?? "";
    const isSaving = pendingKey === key;

    return (
      <>
        <div className="flex items-center gap-2">
            <Input
              className="min-w-[4rem]"
              type="text"
              inputMode="decimal"
            value={value}
            onChange={e => setScoreValues(prev => ({ ...prev, [key]: e.target.value }))}
            onBlur={() => handleSave(key, studentId, instrument.instrumentId)}
          />
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
        </div>
        {errors[key] && <p className="text-rose-600 text-xs mt-1">{errors[key]}</p>}
      </>
    );
  };

  if (studentRows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-500 dark:text-zinc-400">
        Añade alumnos para poder empezar a registrar notas desde la matriz.
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-500 dark:text-zinc-400">
        Vincula una programación para que aparezcan instrumentos y poder introducir notas.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Matriz de notas</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Filas = alumnos, columnas = instrumentos. Edita la nota (0-10) y se guarda automáticamente para el instrumento completo; el motor distribuye ese valor a RA/CE con los pesos configurados en la programación.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30"
            onClick={handleClearAll}
            disabled={isClearingAll}
          >
            {isClearingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="ml-1.5">Borrar todo</span>
          </Button>
        </div>
        {clearError && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-600 dark:bg-rose-900/40 dark:text-rose-200">
            Error al borrar: {clearError}
          </div>
        )}
        <GradeMatrixCsvImport 
          contextId={context.id} 
          students={context.students} 
          plans={plans}
        />
        
        {/* Trimester filters */}
        <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-2">Filtrar por trimestre:</span>
          {(["T1", "T2", "T3"] as TrimesterKey[]).map(t => (
            <label key={t} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <Checkbox 
                checked={selectedTrimesters.has(t)} 
                onCheckedChange={(checked) => {
                  setSelectedTrimesters(prev => {
                    const next = new Set(prev);
                    if (checked) next.add(t);
                    else next.delete(t);
                    return next;
                  });
                }} 
              />
              <span className="font-medium">{t}</span>
            </label>
          ))}
        </div>

        {scoreError && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-600 dark:bg-rose-900/40 dark:text-rose-200">
            No se pudieron cargar las notas ({scoreError})
          </div>
        )}
      </div>

      {planGroups.map(group => (
        <section key={group.plan.id}>

          {group.columns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Esta programación no tiene instrumentos definidos todavía.
            </div>
          ) : (
            <div className="overflow-auto max-w-full max-h-[70vh] rounded-xl border border-zinc-200 dark:border-zinc-800 relative">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-800">
            <tr className="text-left text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">
              <th className={cn("px-4 py-3 sticky left-0 z-30 bg-zinc-50 dark:bg-zinc-900 min-w-[200px]", COLUMN_SEPARATOR_CLASS)}>Alumno</th>
              {group.columns.map((column, index) => (
                <th key={column.instrumentId} className={cn("px-2 py-2", index < group.columns.length - 1 && COLUMN_SEPARATOR_CLASS)}>
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 block">
                      {column.instrumentCode}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                      {column.instrumentName}
                    </span>
                  </div>
                </th>
              ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {studentRows.map(student => (
                <tr key={student.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30">
                    <td className={cn("px-4 py-3 align-top w-[220px] sticky left-0 z-10 bg-white dark:bg-zinc-950", COLUMN_SEPARATOR_CLASS)}>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                        {student.last_name ? `${student.last_name}, ${student.student_name}` : student.student_name}
                      </div>
                    </td>
                      {group.columns.map((column, index) => (
                        <td
                          key={`${student.id}-${column.instrumentId}`}
                          className={cn("px-3 py-3 align-top", index < group.columns.length - 1 && COLUMN_SEPARATOR_CLASS)}
                        >
                          {renderInstrumentCell(column, student.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
