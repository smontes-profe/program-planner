"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { upsertInstrumentScore } from "@/domain/evaluation/actions";
import { type EvaluationContextFull, type InstrumentScore } from "@/domain/evaluation/types";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";

interface PriPmiTabProps {
  readonly context: EvaluationContextFull;
  readonly plans: TeachingPlanFull[];
  readonly scores: InstrumentScore[];
  readonly scoreError?: string;
}

interface PriPmiColumn {
  instrumentId: string;
  instrumentCode: string;
  instrumentName: string;
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

export function PriPmiTab({ context, plans, scores, scoreError }: PriPmiTabProps) {
  const [scoreValues, setScoreValues] = useState<Record<string, string>>(() => buildScoreMap(scores));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setScoreValues(buildScoreMap(scores));
    setErrors({});
  }, [scores]);

  const studentRows = useMemo(
    () => [...context.students.filter((s) => s.active)].sort((a, b) => {
      const lastCmp = (a.last_name ?? "").localeCompare(b.last_name ?? "", undefined, { sensitivity: "base" });
      if (lastCmp !== 0) return lastCmp;
      return (a.student_name ?? "").localeCompare(b.student_name ?? "", undefined, { sensitivity: "base" });
    }),
    [context.students]
  );

  const planGroups = useMemo(() => {
    return plans.map((plan) => {
      const columns: PriPmiColumn[] = (plan.instruments || [])
        .filter((instrument) => instrument.is_pri_pmi)
        .map((instrument) => ({
          instrumentId: instrument.id,
          instrumentCode: instrument.code || instrument.name,
          instrumentName: instrument.name,
        }));

      return { plan, columns };
    });
  }, [plans]);

  const totalPriPmiColumns = useMemo(
    () => planGroups.reduce((sum, group) => sum + group.columns.length, 0),
    [planGroups]
  );

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
              setErrors((prev) => ({ ...prev, [key]: "Introduce un numero valido" }));
              return;
            }
            if (parsed < 0 || parsed > 10) {
              setErrors((prev) => ({ ...prev, [key]: "La nota debe estar entre 0 y 10" }));
              return;
            }
            value = parsed;
          }

          setErrors((prev) => {
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
              setErrors((prev) => ({ ...prev, [key]: result.error }));
              return;
            }
            setScoreValues((prev) => ({
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

  if (studentRows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-500 dark:text-zinc-400">
        Anade alumnos para poder registrar notas PRI/PMI.
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-500 dark:text-zinc-400">
        Vincula una programacion para ver instrumentos PRI/PMI.
      </div>
    );
  }

  if (totalPriPmiColumns === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-500 dark:text-zinc-400">
        No hay instrumentos PRI/PMI configurados todavia.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">PRIS/PMIS</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Fila = alumno, columna = prueba PRI/PMI. Si una celda queda vacia, ese alumno no participa en esa prueba.
        </p>
        {scoreError && (
          <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-600 dark:bg-rose-900/40 dark:text-rose-200">
            No se pudieron cargar las notas ({scoreError})
          </div>
        )}
      </div>

      {planGroups.map((group) => (
        group.columns.length > 0 && (
          <section key={group.plan.id}>
            <div className="overflow-x-auto max-w-full rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left text-xs font-semibold tracking-wide text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
                    <th className="px-4 py-3">Alumno</th>
                    {group.columns.map((column) => (
                      <th key={column.instrumentId} className="px-2 py-2">
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
                  {studentRows.map((student) => (
                    <tr key={student.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30">
                      <td className="px-4 py-3 align-top w-[220px]">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                          {student.last_name ? `${student.last_name}, ${student.student_name}` : student.student_name}
                        </div>
                      </td>
                      {group.columns.map((column) => {
                        const key = scoreKey(student.id, column.instrumentId);
                        const value = scoreValues[key] ?? "";
                        const isSaving = pendingKey === key;
                        return (
                          <td key={`${student.id}-${column.instrumentId}`} className="px-3 py-3 align-top">
                            <div className="flex items-center gap-2">
                              <Input
                                className="min-w-[3rem]"
                                type="number"
                                min={0}
                                max={10}
                                step={1}
                                value={value}
                                onChange={(e) => setScoreValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                onBlur={() => handleSave(key, student.id, column.instrumentId)}
                              />
                              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
                            </div>
                            {errors[key] && <p className="text-rose-600 text-xs mt-1">{errors[key]}</p>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      ))}
    </div>
  );
}
