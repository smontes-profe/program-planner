"use client";

import { type EvaluationContextFull, type GradeComputationResult } from "@/domain/evaluation/types";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Users } from "lucide-react";

interface ExportTabProps {
  readonly context: EvaluationContextFull;
  readonly gradesResult: GradeComputationResult | null;
}

export function ExportTab({ context, gradesResult }: ExportTabProps) {
  function exportStudentGradesCSV() {
    if (!gradesResult) return;

    const headers = ["Nombre", "Email", "Final auto (original)", "Final mejorada", "Completado (%)"];
    // Add RA columns
    if (gradesResult.studentGrades.length > 0) {
      for (const ra of gradesResult.studentGrades[0].raGrades) {
        headers.push(`RA ${ra.raCode} original`);
        headers.push(`RA ${ra.raCode} mejorada`);
      }
      // Add trimester columns
      for (const tri of gradesResult.studentGrades[0].trimesterGrades) {
        headers.push(`${tri.key} auto`);
        headers.push(`${tri.key} ajustada`);
      }
    }

    const rows = gradesResult.studentGrades.map((sg) => {
      const student = context.students.find(st => st.id === sg.studentId);
      const row = [
        sg.studentName,
        student?.student_email || "",
        sg.finalOriginalAutoGrade !== null ? sg.finalOriginalAutoGrade.toFixed(2) : "",
        sg.finalImprovedGrade !== null ? sg.finalImprovedGrade.toFixed(2) : "",
        sg.finalCompletionPercent.toFixed(0),
      ];
      for (const ra of sg.raGrades) {
        row.push(ra.originalGrade !== null ? ra.originalGrade.toFixed(2) : "");
        row.push(ra.improvedGrade !== null ? ra.improvedGrade.toFixed(2) : "");
      }
      for (const tri of sg.trimesterGrades) {
        row.push(tri.autoGrade !== null ? tri.autoGrade.toFixed(2) : "");
        row.push(tri.adjustedGrade !== null ? tri.adjustedGrade.toFixed(2) : "");
      }
      return row.join(",");
    });

    downloadCSV([headers.join(","), ...rows].join("\n"), `notas_${context.title.replace(/\s+/g, "_")}.csv`);
  }

  function exportStudentListCSV() {
    const headers = ["Nombre", "Email"];
    const rows = context.students.map(s => `${s.student_name},${s.student_email || ""}`);
    downloadCSV([headers.join(","), ...rows].join("\n"), `alumnos_${context.title.replace(/\s+/g, "_")}.csv`);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Exportación de notas</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ExportCard
          icon={<FileSpreadsheet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />}
          title="Notas por alumno"
          description="CSV con nota final, notas por RA y por trimestre."
          onClick={exportStudentGradesCSV}
          disabled={!gradesResult || gradesResult.studentGrades.length === 0}
        />
        <ExportCard
          icon={<Users className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />}
          title="Listado de alumnos"
          description="CSV simple con nombre y email de todos los alumnos."
          onClick={exportStudentListCSV}
          disabled={context.students.length === 0}
        />
      </div>
    </div>
  );
}

// ─── Export Card ─────────────────────────────────────────────────────────────
function ExportCard({ icon, title, description, onClick, disabled }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-3">
      {icon}
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className="text-xs text-zinc-500 mt-1">{description}</p>
      </div>
      <Button onClick={onClick} disabled={disabled} size="sm" className="self-start">
        <Download className="h-4 w-4 mr-1" />
        Descargar CSV
      </Button>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
