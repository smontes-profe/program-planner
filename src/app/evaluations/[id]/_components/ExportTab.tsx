"use client";

import { type EvaluationContextFull, type GradeComputationResult } from "@/domain/evaluation/types";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, ClipboardList } from "lucide-react";

interface ExportTabProps {
  readonly context: EvaluationContextFull;
  readonly gradesResult: GradeComputationResult | null;
}

export function ExportTab({ context, gradesResult }: ExportTabProps) {
  
  /** Escapa un campo CSV que pueda contener comas o comillas */
  const esc = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;

  function exportTrimesterGradesCSV() {
    if (!gradesResult) return;

    // Ordenar por apellidos, nombre
    const sorted = [...gradesResult.studentGrades].sort((a, b) => {
      const la = (a.studentLastName ?? "").toLowerCase();
      const lb = (b.studentLastName ?? "").toLowerCase();
      if (la !== lb) return la.localeCompare(lb, undefined, { sensitivity: "base" });
      return (a.studentFirstName || a.studentName || "").localeCompare(b.studentFirstName || b.studentName || "", undefined, { sensitivity: "base" });
    });

    const headers = [
      "Código",
      "Apellidos",
      "Nombre",
      "T1 (Auto)",
      "T1 (Ajustada)",
      "T2 (Auto)",
      "T2 (Ajustada)",
      "T3 (Auto)",
      "T3 (Ajustada)",
      "Final (Auto)",
      "Final (Mejorada)",
    ];

    const rows = sorted.map((sg) => {
      const student = context.students.find(st => st.id === sg.studentId);
      const t1 = sg.trimesterGrades.find(t => t.key === "T1");
      const t2 = sg.trimesterGrades.find(t => t.key === "T2");
      const t3 = sg.trimesterGrades.find(t => t.key === "T3");

      return [
        esc(student?.student_code || ""),
        esc(sg.studentLastName || ""),
        esc(sg.studentFirstName || sg.studentName || ""),
        t1?.autoGrade !== null ? t1?.autoGrade.toFixed(2) : "",
        t1?.adjustedGrade !== null ? t1?.adjustedGrade.toFixed(2) : "",
        t2?.autoGrade !== null ? t2?.autoGrade.toFixed(2) : "",
        t2?.adjustedGrade !== null ? t2?.adjustedGrade.toFixed(2) : "",
        t3?.autoGrade !== null ? t3?.autoGrade.toFixed(2) : "",
        t3?.adjustedGrade !== null ? t3?.adjustedGrade.toFixed(2) : "",
        sg.finalOriginalAutoGrade !== null ? sg.finalOriginalAutoGrade.toFixed(2) : "",
        sg.finalImprovedGrade !== null ? sg.finalImprovedGrade.toFixed(2) : "",
      ].join(",");
    });

    downloadCSV([headers.join(","), ...rows].join("\n"), `notas_trimestrales_${context.title.replace(/\s+/g, "_")}.csv`);
  }

  function exportActaEvaluacionCSV() {
    if (!gradesResult) return;

    const sorted = [...gradesResult.studentGrades].sort((a, b) => {
      const la = (a.studentLastName ?? "").toLowerCase();
      const lb = (b.studentLastName ?? "").toLowerCase();
      if (la !== lb) return la.localeCompare(lb, undefined, { sensitivity: "base" });
      return (a.studentFirstName || a.studentName || "").localeCompare(b.studentFirstName || b.studentName || "", undefined, { sensitivity: "base" });
    });

    const headers = ["Apellidos", "Nombre", "Nota Final", "Resultado"];
    const rows = sorted.map(sg => {
      const grade = sg.finalImprovedGrade ?? 0;
      return [
        esc(sg.studentLastName || ""),
        esc(sg.studentFirstName || sg.studentName || ""),
        grade.toFixed(2),
        grade >= 5 ? "Aprobad@" : "Suspens@"
      ].join(",");
    });

    // Estadísticas
    const total = sorted.length;
    const passed = sorted.filter(s => (s.finalImprovedGrade ?? 0) >= 5).length;
    const average = sorted.reduce((acc, s) => acc + (s.finalImprovedGrade ?? 0), 0) / (total || 1);

    const statsBlock = [
      "",
      "--- ESTADÍSTICAS DEL GRUPO ---",
      `Total alumnos,${total}`,
      `Aprobados,${passed}`,
      `Suspensos,${total - passed}`,
      `% Aprobados,${((passed / (total || 1)) * 100).toFixed(1)}%`,
      `Nota media grupo,${average.toFixed(2)}`,
    ];

    const content = [
      `ACTA DE EVALUACIÓN: ${context.title.toUpperCase()}`,
      `Curso académico: ${context.academic_year}`,
      "",
      headers.join(","),
      ...rows,
      ...statsBlock
    ].join("\n");

    downloadCSV(content, `acta_evaluacion_${context.title.replace(/\s+/g, "_")}.csv`);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Exportación de datos</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ExportCard
          icon={<FileSpreadsheet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />}
          title="Notas trimestrales"
          description="Exporta las notas auto y ajustadas de T1, T2 y T3 de todos los alumnos, incluyendo la nota final del curso."
          onClick={exportTrimesterGradesCSV}
          disabled={!gradesResult || gradesResult.studentGrades.length === 0}
        />
        <ExportCard
          icon={<ClipboardList className="h-8 w-8 text-blue-600 dark:text-blue-400" />}
          title="Acta de evaluación"
          description="Documento resumen con las notas finales mejoradas por alumno y estadísticas globales del grupo (media, aprobados/suspensos)."
          onClick={exportActaEvaluacionCSV}
          disabled={!gradesResult || gradesResult.studentGrades.length === 0}
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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-3 h-full justify-between">
      <div className="flex flex-col gap-3">
        {icon}
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <Button onClick={onClick} disabled={disabled} size="sm" className="self-start mt-2">
        <Download className="h-4 w-4 mr-1" />
        Generar CSV
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
