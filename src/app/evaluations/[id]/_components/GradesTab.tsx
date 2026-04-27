"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import {
  type GradeComputationResult,
  type StudentGradeSummary,
  type StudentRAGradeSummary,
  type TrimesterKey,
} from "@/domain/evaluation/types";
import {
  deleteFinalManualOverride,
  deleteRAManualOverride,
  deleteTrimesterAdjustedOverride,
  updateTrimesterLock,
  upsertFinalManualOverride,
  upsertRAManualOverride,
  upsertTrimesterAdjustedOverride,
} from "@/domain/evaluation/actions";
import { cn } from "@/lib/utils";
import { parseGrade, parseGradeInteger, formatInputValue } from "@/domain/evaluation/grade-ui-helpers";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Circle, Loader2, Lock, PencilLine } from "lucide-react";

interface GradesTabProps {
  readonly contextId: string;
  readonly gradesResult: GradeComputationResult | null;
}

const TRIMESTERS: TrimesterKey[] = ["T1", "T2", "T3"];
const GROUP_SEPARATOR_CLASS = "border-r border-zinc-200 dark:border-zinc-800";

export function GradesTab({ contextId, gradesResult }: GradesTabProps) {
  const [studentGrades, setStudentGrades] = useState<StudentGradeSummary[]>(gradesResult?.studentGrades ?? []);
  const [locks, setLocks] = useState(gradesResult?.trimesterLocks ?? { T1: false, T2: false, T3: false });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [trimesterInputs, setTrimesterInputs] = useState<Record<string, string>>({});
  const [raInputs, setRaInputs] = useState<Record<string, string>>({});
  const [finalInputs, setFinalInputs] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    setStudentGrades(gradesResult?.studentGrades ?? []);
    setLocks(gradesResult?.trimesterLocks ?? { T1: false, T2: false, T3: false });
    setPendingKey(null);
    setErrors({});
    setTrimesterInputs({});
    setRaInputs({});
    setFinalInputs({});
  }, [gradesResult]);

  const sortedStudents = useMemo(
    () => [...studentGrades].sort((a, b) => {
      const la = (a.studentLastName ?? "").toLowerCase();
      const lb = (b.studentLastName ?? "").toLowerCase();
      if (la !== lb) return la.localeCompare(lb, undefined, { sensitivity: "base" });
      return a.studentFirstName.localeCompare(b.studentFirstName, undefined, { sensitivity: "base" });
    }),
    [studentGrades]
  );

  const raColumns = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of sortedStudents) {
      for (const ra of student.raGrades) {
        if (!map.has(ra.raId)) map.set(ra.raId, ra.raCode);
      }
    }
    return Array.from(map.entries())
      .map(([raId, raCode]) => ({ raId, raCode }))
      .sort((a, b) => a.raCode.localeCompare(b.raCode, undefined, { sensitivity: "base" }));
  }, [sortedStudents]);

  if (!gradesResult) {
    return <EmptyState message="No hay datos suficientes para calcular notas." />;
  }

  if (sortedStudents.length === 0) {
    return <EmptyState message="No hay alumnado en este contexto de evaluacion." />;
  }

  const handleLockToggle = (trimester: TrimesterKey, checked: boolean) => {
    const key = `lock:${trimester}`;
    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        try {
          const result = await updateTrimesterLock({
            context_id: contextId,
            trimester_key: trimester,
            closed: checked,
          });
          if (!result.ok) {
            setErrors(prev => ({ ...prev, [key]: result.error }));
            return;
          }
          setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setLocks(prev => ({ ...prev, [trimester]: checked }));
          setStudentGrades(prev =>
            prev.map(student => ({
              ...student,
              trimesterGrades: student.trimesterGrades.map(tri =>
                tri.key === trimester ? { ...tri, autoIsLocked: checked } : tri
              ),
            }))
          );
        } finally {
          setPendingKey(null);
        }
      })();
    });
  };

  const saveTrimesterAdjusted = (studentId: string, trimester: TrimesterKey) => {
    const key = `tri:${studentId}:${trimester}`;
    const student = studentGrades.find(s => s.studentId === studentId);
    const tri = student?.trimesterGrades.find(t => t.key === trimester);
    if (!student || !tri) return;

    const rawValue = trimesterInputs[key] ?? formatInputValue(tri.adjustedGrade);

    // Acepta "NE" directamente, o un número entero (con truncado silencioso si viene decimal)
    let intValue: number;
    const neCheck = rawValue.trim().toUpperCase();
    if (neCheck === "NE") {
      intValue = -1;
    } else {
      const parsed = parseGrade(rawValue);
      if (!parsed.ok) {
        setErrors(prev => ({ ...prev, [key]: parsed.error }));
        return;
      }
      // Truncar silenciosamente a entero
      intValue = Math.floor(parsed.value);
    }

    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        try {
          const result = await upsertTrimesterAdjustedOverride({
            context_id: contextId,
            student_id: studentId,
            trimester_key: trimester,
            adjusted_grade: intValue,
          });
          if (!result.ok) {
            setErrors(prev => ({ ...prev, [key]: result.error }));
            return;
          }
          setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
          setTrimesterInputs(prev => ({ ...prev, [key]: formatInputValue(intValue) }));
          setStudentGrades(prev =>
            prev.map(item =>
              item.studentId === studentId
                ? {
                    ...item,
                    trimesterGrades: item.trimesterGrades.map(current =>
                      current.key === trimester
                        ? { ...current, adjustedGrade: intValue, adjustedIsManual: true }
                        : current
                    ),
                  }
                : item
            )
          );
        } finally {
          setPendingKey(null);
        }
      })();
    });
  };

  const saveRAImproved = (studentId: string, raId: string) => {
    const key = `ra:${studentId}:${raId}`;
    const student = studentGrades.find(s => s.studentId === studentId);
    const ra = student?.raGrades.find(r => r.raId === raId);
    if (!student || !ra) return;

    const parsed = parseGrade(raInputs[key] ?? formatInputValue(ra.improvedGrade));
    if (!parsed.ok) {
      setErrors(prev => ({ ...prev, [key]: parsed.error }));
      return;
    }

    // Si el valor es menor que el autocalculado, revertir a estado automático
    const autoBaseline = ra.improvedAutoGrade ?? ra.originalGrade;
    if (autoBaseline !== null && parsed.value < autoBaseline) {
      resetRAImproved(studentId, raId);
      return;
    }
    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        try {
          const result = await upsertRAManualOverride({
            context_id: contextId,
            student_id: studentId,
            plan_ra_id: raId,
            improved_grade: parsed.value,
          });
          if (!result.ok) {
            setErrors(prev => ({ ...prev, [key]: result.error }));
            return;
          }

          setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setRaInputs(prev => ({ ...prev, [key]: formatInputValue(parsed.value) }));
          setStudentGrades(prev =>
            prev.map(item => {
              if (item.studentId !== studentId) return item;
              const updatedRas = item.raGrades.map(current =>
                current.raId === raId
                  ? {
                      ...current,
                      improvedGrade: parsed.value,
                      improvedIsManual: true,
                      improvedCompletionPercent: 100,
                      improvedHasMissingData: false,
                    }
                  : current
              );
              return recomputeFinals({ ...item, raGrades: updatedRas });
            })
          );
        } finally {
          setPendingKey(null);
        }
      })();
    });
  };

  const saveFinalImproved = (studentId: string) => {
    const key = `final:${studentId}`;
    const student = studentGrades.find(s => s.studentId === studentId);
    if (!student) return;
    const parsed = parseGrade(finalInputs[key] ?? formatInputValue(student.finalImprovedGrade));
    if (!parsed.ok) {
      setErrors(prev => ({ ...prev, [key]: parsed.error }));
      return;
    }

    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        try {
          const result = await upsertFinalManualOverride({
            context_id: contextId,
            student_id: studentId,
            improved_final_grade: parsed.value,
          });
          if (!result.ok) {
            setErrors(prev => ({ ...prev, [key]: result.error }));
            return;
          }
          setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setFinalInputs(prev => ({ ...prev, [key]: formatInputValue(parsed.value) }));
          setStudentGrades(prev =>
            prev.map(item =>
              item.studentId === studentId
                ? {
                    ...item,
                    finalImprovedGrade: parsed.value,
                    finalImprovedIsManual: true,
                    finalImprovedCompletionPercent: 100,
                    finalImprovedHasMissingData: false,
                    finalGrade: parsed.value,
                    finalCompletionPercent: 100,
                  }
                : item
            )
          );
        } finally {
          setPendingKey(null);
        }
      })();
    });
  };

  const resetTrimesterAdjusted = (studentId: string, trimester: TrimesterKey) => {
    const key = `tri:${studentId}:${trimester}`;
    const student = studentGrades.find(s => s.studentId === studentId);
    const tri = student?.trimesterGrades.find(t => t.key === trimester);
    if (!student || !tri || !tri.adjustedIsManual) return;
    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        try {
          const result = await deleteTrimesterAdjustedOverride({ context_id: contextId, student_id: studentId, trimester_key: trimester });
          if (!result.ok) { setErrors(prev => ({ ...prev, [key]: result.error })); return; }
          setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
          const newAdjusted = tri.autoGrade === null ? null : Math.floor(tri.autoGrade);
          setTrimesterInputs(prev => ({ ...prev, [key]: formatInputValue(newAdjusted) }));
          setStudentGrades(prev => prev.map(item => item.studentId !== studentId ? item : {
            ...item,
            trimesterGrades: item.trimesterGrades.map(t => t.key !== trimester ? t : { ...t, adjustedGrade: newAdjusted, adjustedIsManual: false }),
          }));
        } finally { setPendingKey(null); }
      })();
    });
  };

  const resetRAImproved = (studentId: string, raId: string) => {
    const key = `ra:${studentId}:${raId}`;
    const student = studentGrades.find(s => s.studentId === studentId);
    const ra = student?.raGrades.find(r => r.raId === raId);
    if (!student || !ra || !ra.improvedIsManual) return;
    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        try {
          const result = await deleteRAManualOverride({ context_id: contextId, student_id: studentId, plan_ra_id: raId });
          if (!result.ok) { setErrors(prev => ({ ...prev, [key]: result.error })); return; }
          setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
          const autoGrade = ra.improvedAutoGrade ?? null;
          setRaInputs(prev => ({ ...prev, [key]: formatInputValue(autoGrade) }));
          setStudentGrades(prev => prev.map(item => {
            if (item.studentId !== studentId) return item;
            const updatedRas = item.raGrades.map(r => r.raId !== raId ? r : {
              ...r, improvedGrade: autoGrade, improvedIsManual: false,
              improvedCompletionPercent: r.originalCompletionPercent,
              improvedHasMissingData: autoGrade === null || r.originalCompletionPercent < 100,
            });
            return recomputeFinals({ ...item, raGrades: updatedRas });
          }));
        } finally { setPendingKey(null); }
      })();
    });
  };

  const resetFinalImproved = (studentId: string) => {
    const key = `final:${studentId}`;
    const student = studentGrades.find(s => s.studentId === studentId);
    if (!student || !student.finalImprovedIsManual) return;
    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        try {
          const result = await deleteFinalManualOverride({ context_id: contextId, student_id: studentId });
          if (!result.ok) { setErrors(prev => ({ ...prev, [key]: result.error })); return; }
          setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
          const autoGrade = student.finalImprovedAutoGrade ?? null;
          setFinalInputs(prev => ({ ...prev, [key]: formatInputValue(autoGrade) }));
          setStudentGrades(prev => prev.map(item => item.studentId !== studentId ? item : {
            ...item,
            finalImprovedGrade: autoGrade,
            finalImprovedIsManual: false,
            finalImprovedHasMissingData: autoGrade === null,
            finalGrade: autoGrade,
          }));
        } finally { setPendingKey(null); }
      })();
    });
  };


  return (
    <TooltipProvider>
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notas calculadas</h2>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex flex-wrap items-center gap-4">
            {TRIMESTERS.map(trimester => {
              const key = `lock:${trimester}`;
              return (
                <label key={trimester} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <Checkbox checked={locks[trimester]} onCheckedChange={checked => handleLockToggle(trimester, Boolean(checked))} />
                  <span>{trimester} auto cerrada</span>
                  {pendingKey === key && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                </label>
              );
            })}
          </div>
          {TRIMESTERS.map(trimester => {
            const key = `lock:${trimester}`;
            return errors[key] ? <p key={key} className="mt-1 text-xs text-rose-600">{errors[key]}</p> : null;
          })}
        </div>

        {/* Leyenda — tabla de trimestres */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Leyenda:</span>
          <span className="inline-flex items-center gap-1">
            <span className="font-mono font-semibold text-emerald-600">8.50</span>
            <span>Aprobado (≥ 5)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-mono font-semibold text-rose-600">3.20</span>
            <span>Suspenso (&lt; 5)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Datos incompletos</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3 w-3 text-zinc-400" />
            <span>Trimestre cerrado (auto congelada)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <PencilLine className="h-3.5 w-3.5 text-blue-500" />
            <span>Ajuste manual</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-mono font-semibold text-zinc-500/80 dark:text-zinc-400/80">NE</span>
            <span>No Evaluado</span>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className={cn("px-3 py-2 text-left", GROUP_SEPARATOR_CLASS)}>Alumno</th>
                {TRIMESTERS.map(trimester => <th key={trimester} colSpan={2} className={cn("px-1 py-2 text-center", GROUP_SEPARATOR_CLASS)}>{trimester}</th>)}
                <th colSpan={2} className="px-1 py-2 text-center">Final</th>
              </tr>
              <tr>
                <th className={cn("px-3 py-1.5 text-left", GROUP_SEPARATOR_CLASS)}>&nbsp;</th>
                {TRIMESTERS.map(trimester => (
                  <Fragment key={`${trimester}-sub`}>
                    <th className="px-1 py-1.5 text-center">Auto</th>
                    <th className={cn("px-1 py-1.5 text-center", GROUP_SEPARATOR_CLASS)}>Ajustada</th>
                  </Fragment>
                ))}
                <th className="px-1 py-1.5 text-center">Auto</th>
                <th className="px-1 py-1.5 text-center">Ajustada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sortedStudents.map(student => (
                <tr key={student.studentId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className={cn("px-3 py-2 text-xs font-semibold", GROUP_SEPARATOR_CLASS)}>{formatStudentName(student)}</td>
                  {TRIMESTERS.map(trimester => {
                    const tri = student.trimesterGrades.find(t => t.key === trimester);
                    if (!tri) {
                      return <Fragment key={`${student.studentId}-${trimester}`}><td className="px-1 py-2 text-center">-</td><td className="px-1 py-2 text-center">-</td></Fragment>;
                    }
                    const key = `tri:${student.studentId}:${trimester}`;
                    const value = trimesterInputs[key] ?? formatInputValue(tri.adjustedGrade);
                    return (
                      <Fragment key={`${student.studentId}-${trimester}`}>
                        <td className="px-1 py-2 text-center">
                          <span className={cn("font-mono text-xs font-semibold", gradeColorClass(tri.autoGrade))}>{formatGrade(tri.autoGrade)}</span>
                          {tri.autoHasMissingData && <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" />}
                          {tri.autoIsLocked && <Lock className="ml-1 inline h-3 w-3 text-zinc-400" />}
                        </td>
                        <td className={cn("px-1 py-2 text-center", GROUP_SEPARATOR_CLASS)}>
                          <div className="inline-flex items-center gap-0.5">
                            {(() => {
                              const isNE = value.trim().toUpperCase() === "NE" || tri.adjustedGrade === -1;
                              const numericGrade = isNE ? -1 : tri.adjustedGrade;
                              return (
                                <Input
                                  className={cn(
                                    "h-7 w-[62px] text-center text-xs",
                                    errors[key]
                                      ? "border-rose-400"
                                      : isNE
                                        ? "border-zinc-400 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
                                        : numericGrade !== null && numericGrade >= 5
                                          ? "border-emerald-400 dark:border-emerald-600"
                                          : numericGrade !== null
                                            ? "border-rose-300 dark:border-rose-600"
                                            : "",
                                  )}
                                  type="text"
                                  inputMode="text"
                                  value={value}
                                  onChange={e => setTrimesterInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                  onBlur={() => saveTrimesterAdjusted(student.studentId, trimester)}
                                />
                              );
                            })()}
                            {pendingKey === key && <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />}
                            {tri.adjustedIsManual && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span role="button" onClick={() => resetTrimesterAdjusted(student.studentId, trimester)} className="rounded p-0.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer" aria-label="Restablecer ajuste">
                                    <PencilLine className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Clic para restablecer al valor automático</TooltipContent>
                              </Tooltip>
                            )}
                            {tri.adjustedHasMissingData && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                          </div>
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="px-1 py-2 text-center">
                    <div className="inline-flex items-center gap-1">
                      <span className={cn("font-mono text-xs font-semibold", gradeColorClass(student.finalOriginalAutoGrade))}>
                        {formatGrade(student.finalOriginalAutoGrade)}
                      </span>
                      {student.finalOriginalHasMissingData && (
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-2 text-center">
                    {(() => {
                      const key = `final:${student.studentId}`;
                      const value = finalInputs[key] ?? formatInputValue(student.finalImprovedGrade);
                      return (
                        <div className="inline-flex items-center gap-0.5">
                          <Input className={cn("h-7 w-[62px] text-center text-xs", errors[key] && "border-rose-400")} type="number" min={0} max={10} step={0.01} value={value} onChange={e => setFinalInputs(prev => ({ ...prev, [key]: e.target.value }))} onBlur={() => saveFinalImproved(student.studentId)} />
                          {pendingKey === key && <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />}
                          {student.finalImprovedIsManual && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span role="button" onClick={() => resetFinalImproved(student.studentId)} className="rounded p-0.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer" aria-label="Restablecer nota final">
                                  <PencilLine className="h-3 w-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Clic para restablecer al valor automático</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda — tabla de RA */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Notas por RA —</span>
          <span className="inline-flex items-center gap-1">
            <Circle className="h-3 w-3 fill-rose-500 text-rose-500" />
            <span>Sin evaluar (0%)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Evaluación parcial (&lt; 100%)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <PencilLine className="h-3.5 w-3.5 text-blue-500" />
            <span>Nota ajustada manualmente</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="rounded px-1 py-0.5 text-[10px] font-semibold text-emerald-600">PRI</span>
            <span>Nota mejorada por PRI/PMI</span>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className={cn("px-3 py-2 text-left", GROUP_SEPARATOR_CLASS)}>Alumno</th>
                {raColumns.map(ra => <th key={ra.raId} colSpan={2} className={cn("px-1 py-2 text-center", GROUP_SEPARATOR_CLASS)}>RA {ra.raCode}</th>)}
              </tr>
              <tr>
                <th className={cn("px-3 py-1.5 text-left", GROUP_SEPARATOR_CLASS)}>&nbsp;</th>
                {raColumns.map(ra => <Fragment key={`${ra.raId}-labels`}><th className="px-1 py-1.5 text-center">Original</th><th className={cn("px-1 py-1.5 text-center", GROUP_SEPARATOR_CLASS)}>Ajustada</th></Fragment>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sortedStudents.map(student => (
                <tr key={`ra-${student.studentId}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className={cn("px-3 py-2 text-xs font-semibold", GROUP_SEPARATOR_CLASS)}>{formatStudentName(student)}</td>
                  {raColumns.map(column => {
                    const ra = student.raGrades.find(item => item.raId === column.raId);
                    if (!ra) return <Fragment key={`${student.studentId}-${column.raId}`}><td className="px-1 py-2 text-center">-</td><td className={cn("px-1 py-2 text-center", GROUP_SEPARATOR_CLASS)}>-</td></Fragment>;
                    const key = `ra:${student.studentId}:${column.raId}`;
                    const value = raInputs[key] ?? formatInputValue(ra.improvedGrade);
                    const isPriApplied = ra.improvedAutoGrade !== null && !ra.improvedIsManual;
                    return (
                      <Fragment key={`${student.studentId}-${column.raId}`}>
                        <td className="px-1 py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className={cn("font-mono text-xs font-semibold", gradeColorClass(ra.originalGrade))}>
                              {formatGrade(ra.originalGrade)}
                            </span>
                            {ra.originalGrade === null && ra.originalCompletionPercent === 0 && (
                              <Circle className="h-3 w-3 fill-rose-500 text-rose-500" />
                            )}
                            {ra.originalHasMissingData && ra.originalCompletionPercent > 0 && (
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        </td>
                        <td className={cn("px-1 py-2 text-center", GROUP_SEPARATOR_CLASS)}>
                          <div className="inline-flex items-center gap-0.5">
                            <Input
                              className={cn(
                                "h-7 w-[62px] text-center text-xs",
                                isPriApplied && "border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300",
                                errors[key] && "border-rose-400",
                              )}
                              type="number" min={0} max={10} step={0.01}
                              value={value}
                              onChange={e => setRaInputs(prev => ({ ...prev, [key]: e.target.value }))}
                              onBlur={() => saveRAImproved(student.studentId, column.raId)}
                            />
                            {pendingKey === key && <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />}
                            {ra.improvedIsManual && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span role="button" onClick={() => resetRAImproved(student.studentId, column.raId)} className="rounded p-0.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer" aria-label="Restablecer nota RA">
                                    <PencilLine className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Clic para restablecer al valor automático</TooltipContent>
                              </Tooltip>
                            )}
                            {ra.improvedHasMissingData && ra.originalCompletionPercent === 0 && (
                              <Circle className="h-3 w-3 fill-rose-500 text-rose-500" />
                            )}
                            {ra.improvedHasMissingData && ra.originalCompletionPercent > 0 && (
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            )}
                            {isPriApplied && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="rounded px-1 py-0.5 text-[10px] font-semibold text-violet-600 cursor-help">PRI</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] text-xs">
                                  {ra.priPmiImpacts.map(impact => (
                                    <p key={`${impact.instrumentId}:${impact.scoreDate ?? "none"}`}>
                                      {impact.instrumentCode}: {impact.scoreValue.toFixed(2)}{impact.isApplied ? " (aplicada)" : ""}
                                    </p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notas calculadas</h2>
      <div className="py-12 text-center text-sm text-zinc-400">{message}</div>
    </div>
  );
}

function formatStudentName(student: StudentGradeSummary): string {
  const firstName = student.studentFirstName || student.studentName || "";
  return student.studentLastName ? `${student.studentLastName}, ${firstName}` : firstName || "-";
}

function formatGrade(value: number | null): string {
  if (value === null) return "-";
  if (value === -1) return "NE";
  return value.toFixed(2);
}

function gradeColorClass(value: number | null): string {
  if (value === null) return "text-zinc-400";
  if (value === -1) return "text-zinc-500/80 dark:text-zinc-400/80";
  if (value >= 5) return "text-emerald-600 dark:text-emerald-400";
  return "text-rose-600 dark:text-rose-400";
}

function recomputeFinals(student: StudentGradeSummary): StudentGradeSummary {
  const original = computeWeighted(student.raGrades, "originalGrade", "originalCompletionPercent");
  const improved = computeWeighted(student.raGrades, "improvedGrade", "improvedCompletionPercent");
  const finalImprovedGrade = student.finalImprovedIsManual ? student.finalImprovedGrade : improved.grade;
  const finalImprovedCompletionPercent = student.finalImprovedIsManual ? 100 : improved.completion;

  return {
    ...student,
    finalOriginalAutoGrade: original.grade,
    finalOriginalCompletionPercent: original.completion,
    finalOriginalHasMissingData: original.grade === null || original.completion < 100,
    finalImprovedAutoGrade: improved.grade,
    finalImprovedGrade,
    finalImprovedCompletionPercent,
    finalImprovedHasMissingData: finalImprovedGrade === null || finalImprovedCompletionPercent < 100,
    finalGrade: finalImprovedGrade,
    finalCompletionPercent: finalImprovedCompletionPercent,
  };
}

function computeWeighted(
  ras: StudentRAGradeSummary[],
  gradeKey: "originalGrade" | "improvedGrade",
  completionKey: "originalCompletionPercent" | "improvedCompletionPercent"
): { grade: number | null; completion: number } {
  const withWeight = ras.filter(ra => ra.weightInPlan > 0);
  const pool = withWeight.length > 0 ? withWeight : ras;
  if (pool.length === 0) return { grade: null, completion: 0 };

  let sum = 0;
  let sumWeight = 0;
  let completionSum = 0;
  let completionWeight = 0;

  for (const ra of pool) {
    const factor = withWeight.length > 0 ? ra.weightInPlan / 100 : 1;
    if (ra[gradeKey] !== null) {
      sum += (ra[gradeKey] ?? 0) * factor;
      sumWeight += factor;
    }
    completionSum += ra[completionKey] * factor;
    completionWeight += factor;
  }

  return {
    grade: sumWeight > 0 ? Math.round((sum / sumWeight) * 100) / 100 : null,
    completion: completionWeight > 0 ? Math.round((completionSum / completionWeight) * 100) / 100 : 0,
  };
}
