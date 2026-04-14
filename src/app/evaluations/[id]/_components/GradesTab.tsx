"use client";

import { type GradeComputationResult, type StudentGradeSummary } from "@/domain/evaluation/types";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, BarChart3, Users, TrendingUp } from "lucide-react";

interface GradesTabProps {
  readonly gradesResult: GradeComputationResult | null;
}

export function GradesTab({ gradesResult }: GradesTabProps) {
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

  const { studentGrades, groupStats } = gradesResult;

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
            {studentGrades.map((sg: StudentGradeSummary, i: number) => (
              <StudentGradeRow key={sg.studentId} student={sg} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-student RA detail (expandable) */}
      {studentGrades.map((sg: StudentGradeSummary) => (
        <RADetail key={sg.studentId} student={sg} />
      ))}
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

  const nameLabel = sg.studentLastName
    ? `${sg.studentLastName}, ${sg.studentFirstName}`
    : sg.studentFirstName;

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

// ─── RA Detail per Student ───────────────────────────────────────────────────
function RADetail({ student: sg }: { student: StudentGradeSummary }) {
  return (
    <div className="mt-2 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
        {sg.studentName} — Desglose por RA
      </p>
      <div className="flex flex-wrap gap-3">
        {sg.raGrades.map((ra) => (
          <div key={ra.raId} className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-zinc-500">RA {ra.raCode}</span>
            <span className={cn(
              "font-mono font-semibold",
              ra.grade === null ? "text-zinc-300" :
              ra.grade >= 5 ? "text-emerald-600" : "text-red-600"
            )}>
              {ra.grade !== null ? ra.grade.toFixed(2) : "—"}
            </span>
            <span className="text-[10px] text-zinc-400">({ra.completionPercent.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
