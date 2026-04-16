"use client";

import { type GradeComputationResult, type StudentGradeSummary } from "@/domain/evaluation/types";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, BarChart3, Users, TrendingUp } from "lucide-react";

interface GradesTabProps {
  readonly gradesResult: GradeComputationResult | null;
}

interface RAColumn {
  raId: string;
  raCode: string;
}

export function GradesTab({ gradesResult }: GradesTabProps) {
  const studentGrades = gradesResult?.studentGrades ?? [];
  const groupStats = gradesResult?.groupStats ?? {
    averageFinalGrade: null,
    medianFinalGrade: null,
    gradedStudents: 0,
    totalStudents: 0,
  };

  const sortedStudentGrades = [...studentGrades].sort((a, b) => {
    const lastA = (a.studentLastName ?? "").toLowerCase();
    const lastB = (b.studentLastName ?? "").toLowerCase();
    if (lastA && lastB && lastA !== lastB) return lastA.localeCompare(lastB, undefined, { sensitivity: "base" });
    if (lastA !== lastB) return lastA ? -1 : 1;
    const firstA = (a.studentFirstName ?? "").toLowerCase();
    const firstB = (b.studentFirstName ?? "").toLowerCase();
    return firstA.localeCompare(firstB, undefined, { sensitivity: "base" });
  });

  const raColumnsMap = new Map<string, RAColumn>();
  for (const student of studentGrades) {
    for (const ra of student.raGrades) {
      if (!raColumnsMap.has(ra.raId)) {
        raColumnsMap.set(ra.raId, { raId: ra.raId, raCode: ra.raCode });
      }
    }
  }
  const raColumns = Array.from(raColumnsMap.values()).sort((a, b) =>
    a.raCode.localeCompare(b.raCode, undefined, { sensitivity: "base" })
  );

  if (!gradesResult) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notas calculadas</h2>
        <div className="text-center py-12 text-zinc-400 text-sm">
          <p>No hay datos suficientes para calcular notas. Asegúrate de tener alumnos vinculados y notas registradas.</p>
        </div>
      </div>
    );
  }

  if (studentGrades.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notas calculadas</h2>
        <div className="text-center py-12 text-zinc-400 text-sm">
          <p>No hay alumnos en este contexto de evaluación.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notas calculadas</h2>

      {/* Group statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          label="Nota media"
          value={groupStats.averageFinalGrade !== null ? groupStats.averageFinalGrade.toFixed(2) : "—"}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          label="Mediana"
          value={groupStats.medianFinalGrade !== null ? groupStats.medianFinalGrade.toFixed(2) : "—"}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />}
          label="Alumnos evaluados"
          value={`${groupStats.gradedStudents} / ${groupStats.totalStudents}`}
        />
      </div>

      {/* Per-student grades table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 w-8">#</th>
          <th className="text-left px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 min-w-[150px]">Alumno</th>
          <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">T1</th>
          <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">T2</th>
          <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">T3</th>
          <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">Nota Final</th>
          <th className="text-center px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">Completado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedStudentGrades.map((sg: StudentGradeSummary, i: number) => (
              <StudentGradeRow key={sg.studentId} student={sg} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Desglose por RA
        </p>
        {raColumns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            No hay RAs disponibles para mostrar el desglose.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <th className="px-3 py-2.5">Alumno</th>
                  {raColumns.map(column => (
                    <th key={column.raId} className="px-3 py-2.5 text-center">
                      RA {column.raCode}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedStudentGrades.map(student => (
                  <tr key={student.studentId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-3 py-3 align-top w-[220px]">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                        {formatStudentLabel(student)}
                      </div>
                    </td>
                    {raColumns.map(column => (
                      <td key={`${student.studentId}-${column.raId}`} className="px-3 py-3 align-top">
                        {renderRACell(student, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50">{value}</p>
      </div>
    </div>
  );
}

// ─── Student Grade Row ───────────────────────────────────────────────────────
const trimesterOrder: ("T1" | "T2" | "T3")[] = ["T1", "T2", "T3"];

function StudentGradeRow({ student: sg, index }: { student: StudentGradeSummary; index: number }) {

  const nameLabel = formatStudentLabel(sg);

  const availableTrimesterGrades = sg.trimesterGrades.filter(tri => tri.grade !== null);
  const computedFinalGrade = availableTrimesterGrades.length > 0
    ? availableTrimesterGrades.reduce((sum, tri) => sum + (tri.grade ?? 0), 0) / availableTrimesterGrades.length
    : null;

  const hasIncompleteTrimester = sg.trimesterGrades.some(tri => tri.completionPercent < 100);

  const finalGradeColor = computedFinalGrade === null
    ? "text-zinc-400"
    : computedFinalGrade >= 5
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
      <td className="px-3 py-2 text-zinc-400 font-mono text-xs">{index + 1}</td>
      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{nameLabel}</td>
      {trimesterOrder.map((key) => {
        const tri = sg.trimesterGrades.find(tri => tri.key === key);
        return (
          <td key={key} className="px-3 py-2 text-center">
            <TrimesterCell trimester={tri} />
          </td>
        );
      })}
      <td className={cn("px-3 py-2 text-center font-mono font-bold flex items-center justify-center gap-1", finalGradeColor)}>
        {computedFinalGrade !== null ? computedFinalGrade.toFixed(2) : "—"}
        {hasIncompleteTrimester && (
          <AlertTriangle className="h-3 w-3 text-amber-500" />
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                sg.finalCompletionPercent >= 75 ? "bg-emerald-500" :
                sg.finalCompletionPercent >= 50 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(100, sg.finalCompletionPercent)}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 w-10 text-right">{sg.finalCompletionPercent.toFixed(0)}%</span>
        </div>
      </td>
    </tr>
  );
}

interface TrimesterCellProps {
  trimester?: StudentGradeSummary["trimesterGrades"][number];
}

function TrimesterCell({ trimester }: TrimesterCellProps) {
  if (!trimester) {
    return <span className="font-mono text-xs text-zinc-400">—</span>;
  }

  const gradeValue = trimester.grade;
  const gradeColor = gradeValue === null
    ? "text-zinc-400"
    : gradeValue >= 5
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  const AlertIcon =
    trimester.completionPercent === 0 ? (
      <AlertCircle className="h-3 w-3 text-rose-500" />
    ) : trimester.completionPercent < 100 ? (
      <AlertTriangle className="h-3 w-3 text-amber-500" />
    ) : null;

  return (
    <div className="flex items-center justify-center gap-1">
      {AlertIcon}
      <span className={cn("font-mono text-xs", gradeColor)}>
        {gradeValue !== null ? gradeValue.toFixed(1) : "—"}
      </span>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatStudentLabel(student: StudentGradeSummary) {
  const firstName = student.studentFirstName || student.studentName || "";
  return student.studentLastName
    ? `${student.studentLastName}, ${firstName}`
    : firstName || "—";
}

function renderRACell(student: StudentGradeSummary, column: RAColumn) {
  const ra = student.raGrades.find(entry => entry.raId === column.raId);
  const gradeValue = ra?.grade ?? null;
  const completionPercent = ra?.completionPercent ?? 0;
  const isNotEvaluated = completionPercent === 0;
  const isPartial = completionPercent > 0 && completionPercent < 100;

  const gradeColorClass = gradeValue === null
    ? "text-zinc-400"
    : gradeValue >= 5
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  const AlertIcon = isNotEvaluated ? (
    <AlertCircle className="h-3 w-3 text-rose-500" />
  ) : isPartial ? (
    <AlertTriangle className="h-3 w-3 text-amber-500" />
  ) : null;

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center justify-center gap-1">
        {AlertIcon}
        <span className={cn("font-mono text-xs font-semibold", gradeColorClass)}>
          {gradeValue !== null ? gradeValue.toFixed(2) : "—"}
        </span>
      </div>
      <span className="text-[10px] text-zinc-400">
        {completionPercent.toFixed(0)}%
      </span>
    </div>
  );
}
