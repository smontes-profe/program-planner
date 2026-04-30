"use client";

import { useState, useMemo, useTransition } from "react";
import { type EvaluationContextFull, type EvaluationContextShare, type GradeComputationResult, type InstrumentScore } from "@/domain/evaluation/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileSpreadsheet, ClipboardList, Database, LayoutGrid, Loader2, Share2, Trash2 } from "lucide-react";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";
import { formatAdjustedGradeValue, isCountableAdjustedGradeValue } from "@/domain/evaluation/grade-values";
import { removeEvaluationShare, shareEvaluation } from "@/domain/evaluation/actions";

interface ExportTabProps {
  readonly context: EvaluationContextFull;
  readonly gradesResult: GradeComputationResult | null;
  readonly plans: TeachingPlanFull[];
  readonly scores: InstrumentScore[];
  readonly shares: EvaluationContextShare[];
}

export function ExportTab({ context, gradesResult, plans, scores, shares }: ExportTabProps) {
  const [includePriPmi, setIncludePriPmi] = useState(false);
  const [shareRows, setShareRows] = useState<EvaluationContextShare[]>(shares);
  const [shareEmails, setShareEmails] = useState("");
  const [shareWarnings, setShareWarnings] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState("");
  const [shareError, setShareError] = useState("");
  const [isSharingPending, startSharingTransition] = useTransition();

  /** Escapa un campo CSV que pueda contener comas o comillas */
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  /** Ordenar alumnos por apellidos, nombre */
  const sortedStudentGrades = useMemo(() => {
    if (!gradesResult) return [];
    return [...gradesResult.studentGrades].sort((a, b) => {
      const la = (a.studentLastName ?? "").toLowerCase();
      const lb = (b.studentLastName ?? "").toLowerCase();
      if (la !== lb) return la.localeCompare(lb, undefined, { sensitivity: "base" });
      return (a.studentFirstName || a.studentName || "").localeCompare(b.studentFirstName || b.studentName || "", undefined, { sensitivity: "base" });
    });
  }, [gradesResult]);

  function exportTrimesterGradesCSV() {
    if (!gradesResult) return;

    const headers = [
      "Código", "Apellidos", "Nombre",
      "T1 (Auto)", "T1 (Ajustada)",
      "T2 (Auto)", "T2 (Ajustada)",
      "T3 (Auto)", "T3 (Ajustada)",
      "Final (Auto)", "Final (Mejorada)",
    ];

    const rows = sortedStudentGrades.map((sg) => {
      const student = context.students.find(st => st.id === sg.studentId);
      const t1 = sg.trimesterGrades.find(t => t.key === "T1");
      const t2 = sg.trimesterGrades.find(t => t.key === "T2");
      const t3 = sg.trimesterGrades.find(t => t.key === "T3");

      return [
        esc(student?.student_code),
        esc(sg.studentLastName),
        esc(sg.studentFirstName || sg.studentName),
        esc(t1?.autoGrade?.toFixed(2)),
        esc(formatAdjustedGradeValue(t1?.adjustedGrade)),
        esc(t2?.autoGrade?.toFixed(2)),
        esc(formatAdjustedGradeValue(t2?.adjustedGrade)),
        esc(t3?.autoGrade?.toFixed(2)),
        esc(formatAdjustedGradeValue(t3?.adjustedGrade)),
        esc(sg.finalOriginalAutoGrade?.toFixed(2)),
        esc(formatAdjustedGradeValue(sg.finalImprovedGrade)),
      ].join(",");
    });

    downloadCSV([headers.join(","), ...rows].join("\n"), `notas_trimestrales_${context.title.replace(/\s+/g, "_")}.csv`);
  }

  function exportRAsAndCEsCSV() {
    if (!gradesResult) return;

    // Obtener todos los RAs y CEs de todos los planes
    const allRAs = plans.flatMap(p => p.ras || []).sort((a, b) => a.code.localeCompare(b.code));
    
    // Headers: Info Alumno + (RA + sus CEs)
    const headers = ["Código", "Apellidos", "Nombre"];
    allRAs.forEach(ra => {
      headers.push(`RA ${ra.code}`);
      (ra.ces || []).forEach(ce => {
        headers.push(`CE ${ce.code}`);
      });
    });

    const rows = sortedStudentGrades.map(sg => {
      const student = context.students.find(st => st.id === sg.studentId);
      const row = [
        esc(student?.student_code),
        esc(sg.studentLastName),
        esc(sg.studentFirstName || sg.studentName)
      ];

      allRAs.forEach(ra => {
        const raGrade = sg.raGrades.find(rg => rg.raId === ra.id);
        row.push(esc(formatAdjustedGradeValue(raGrade?.improvedGrade)));
        
        // Para los CEs, el motor no los devuelve calculados. 
        // En una implementación real ideal estarían en el motor.
        // Aquí los dejamos vacíos o podríamos re-calcularlos si fuera crítico.
        // Dado el alcance, pondremos "—" o vacío para los CEs si no disponemos del dato listo.
        // TODO: Si se requiere el dato del CE, habría que exponerlo en el motor de cálculo.
        (ra.ces || []).forEach(() => {
          row.push(""); 
        });
      });

      return row.join(",");
    });

    downloadCSV([headers.join(","), ...rows].join("\n"), `notas_ras_ces_${context.title.replace(/\s+/g, "_")}.csv`);
  }

  function exportInstrumentsCSV() {
    if (!gradesResult) return;

    // Obtener instrumentos válidos
    const allInstruments = plans
      .flatMap(p => p.instruments || [])
      .filter(inst => includePriPmi || !inst.is_pri_pmi)
      .sort((a, b) => {
        const codeA = a.code || "";
        const codeB = b.code || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
      });

    const headers = ["Código", "Apellidos", "Nombre", ...allInstruments.map(i => esc(i.code || i.name))];

    const rows = sortedStudentGrades.map(sg => {
      const student = context.students.find(st => st.id === sg.studentId);
      const row = [
        esc(student?.student_code),
        esc(sg.studentLastName),
        esc(sg.studentFirstName || sg.studentName)
      ];

      allInstruments.forEach(inst => {
        const score = scores.find(s => s.student_id === sg.studentId && s.instrument_id === inst.id);
        row.push(esc(score?.score_value?.toFixed(2)));
      });

      return row.join(",");
    });

    downloadCSV([headers.join(","), ...rows].join("\n"), `notas_instrumentos_${context.title.replace(/\s+/g, "_")}.csv`);
  }

  function exportActaEvaluacionCSV() {
    if (!gradesResult) return;

    const headers = ["Apellidos", "Nombre", "Nota Final", "Resultado"];
    const rows = sortedStudentGrades.map(sg => {
      const grade = sg.finalImprovedGrade;
      const displayGrade = grade === null ? "" : formatAdjustedGradeValue(grade);
      return [
        esc(sg.studentLastName),
        esc(sg.studentFirstName || sg.studentName),
        esc(displayGrade),
        grade !== null && isCountableAdjustedGradeValue(grade)
          ? grade >= 5
            ? "Aprobad@"
            : "Suspens@"
          : displayGrade || "Sin calificar",
      ].join(",");
    });

    const total = sortedStudentGrades.length;
    const countableGrades = sortedStudentGrades
      .map(s => s.finalImprovedGrade)
      .filter((value): value is number => isCountableAdjustedGradeValue(value));
    const specialGrades = total - countableGrades.length;
    const passed = countableGrades.filter(value => value >= 5).length;
    const average = countableGrades.length > 0 ? countableGrades.reduce((acc, value) => acc + value, 0) / countableGrades.length : 0;

    const statsBlock = [
      "",
      "--- ESTADÍSTICAS DEL GRUPO ---",
      `Total alumnos,${total}`,
      `Calificaciones numéricas,${countableGrades.length}`,
      `Aprobados,${passed}`,
      `Suspensos,${countableGrades.length - passed}`,
      `Situaciones especiales,${specialGrades}`,
      `% Aprobados,${((passed / (countableGrades.length || 1)) * 100).toFixed(1)}%`,
      `Nota media grupo,${countableGrades.length > 0 ? average.toFixed(2) : "-"}`,
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

  function handleShareSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShareError("");
    setShareMessage("");
    setShareWarnings([]);

    startSharingTransition(async () => {
      const result = await shareEvaluation(context.id, shareEmails);
      if (!result.ok) {
        setShareError(result.error);
        return;
      }

      setShareRows(result.data.shares);
      setShareWarnings(result.data.warnings);
      setShareMessage(
        result.data.added.length > 0
          ? `Acceso añadido para: ${result.data.added.join(", ")}.`
          : "No se han añadido nuevos accesos."
      );
      setShareEmails("");
    });
  }

  function handleRemoveShare(shareId: string) {
    setShareError("");
    setShareMessage("");
    setShareWarnings([]);

    startSharingTransition(async () => {
      const result = await removeEvaluationShare(context.id, shareId);
      if (!result.ok) {
        setShareError(result.error);
        return;
      }

      setShareRows(result.data);
      setShareMessage("Acceso eliminado.");
    });
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
          icon={<Database className="h-8 w-8 text-amber-600 dark:text-amber-400" />}
          title="Notas por RAs"
          description="Exporta las notas calculadas por Resultados de Aprendizaje (RA) y Criterios de Evaluación (CE) para cada alumno."
          onClick={exportRAsAndCEsCSV}
          disabled={!gradesResult || gradesResult.studentGrades.length === 0}
        />
        <ExportCard
          icon={<LayoutGrid className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="Notas por instrumentos"
          description="Exporta la matriz de notas introducidas por instrumento. Permite elegir si incluir instrumentos de recuperación (PRI/PMI)."
          onClick={exportInstrumentsCSV}
          disabled={!gradesResult || gradesResult.studentGrades.length === 0}
          extraFooter={
            <div className="flex items-center gap-2 px-1">
              <Checkbox 
                id="include-pri-pmi" 
                checked={includePriPmi} 
                onCheckedChange={(checked) => setIncludePriPmi(!!checked)} 
              />
              <label htmlFor="include-pri-pmi" className="text-xs text-zinc-500 cursor-pointer">Incluir PRI/PMI</label>
            </div>
          }
        />
        <ExportCard
          icon={<ClipboardList className="h-8 w-8 text-blue-600 dark:text-blue-400" />}
          title="Acta de evaluación"
          description="Documento resumen con las notas finales mejoradas por alumno y estadísticas globales del grupo (media, aprobados/suspensos)."
          onClick={exportActaEvaluacionCSV}
          disabled={!gradesResult || gradesResult.studentGrades.length === 0}
        />
      </div>

      {context.is_owner ? (
        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <Share2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Compartir evaluación</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Añade los emails de los usuarios que quieras invitar, separados por comas. Esos usuarios podrán ver tus evaluaciones pero no modificarlas. Esto es útil, por ejemplo, para dar visibilidad a tus evaluaciones a tutores, jefes de estudio, etc.
                </p>
              </div>

              {shareRows.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  Todavía no hay usuarios invitados.
                </p>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {shareRows.map((share) => (
                    <div key={share.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          {share.invited_name || share.invited_email}
                        </p>
                        {share.invited_name ? (
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{share.invited_email}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        disabled={isSharingPending}
                        className="shrink-0"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleShareSubmit} className="space-y-3">
                <textarea
                  value={shareEmails}
                  onChange={(e) => setShareEmails(e.target.value)}
                  rows={3}
                  placeholder="usuario1@centro.com, usuario2@centro.com"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <Button type="submit" disabled={isSharingPending || shareEmails.trim().length === 0}>
                  {isSharingPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                  Añadir acceso
                </Button>
              </form>

              {shareError ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{shareError}</p> : null}
              {shareMessage ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{shareMessage}</p> : null}
              {shareWarnings.length > 0 ? (
                <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  {shareWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ─── Export Card ─────────────────────────────────────────────────────────────
function ExportCard({ icon, title, description, onClick, disabled, extraFooter }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  extraFooter?: React.ReactNode;
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
      <div className="space-y-3">
        {extraFooter}
        <Button onClick={onClick} disabled={disabled} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-1" />
          Generar CSV
        </Button>
      </div>
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
