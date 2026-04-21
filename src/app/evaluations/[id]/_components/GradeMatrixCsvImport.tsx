"use client";

import { ChangeEvent, useRef, useState, useMemo } from "react";
import { Loader2, FileUp, AlertCircle, CheckCircle2, X, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type EvaluationContextFull, type InstrumentScore } from "@/domain/evaluation/types";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GradeMatrixCsvImportProps {
  contextId: string;
  students: EvaluationContextFull["students"];
  plans: TeachingPlanFull[];
}

interface ParsedRow {
  studentId: string;
  email: string;
  studentName: string;
  scores: {
    instrumentId: string;
    label: string;
    value: number;
    rawValue: string;
    error?: string;
  }[];
  error?: string;
}

interface ImportPreview {
  fileName: string;
  instrumentsFound: { id: string; code: string; label: string }[];
  rows: ParsedRow[];
  totalValidScores: number;
}

type Status = {
  type: "idle" | "parsing" | "loading" | "success" | "error";
  message?: string;
};

export function GradeMatrixCsvImport({ contextId, students, plans }: GradeMatrixCsvImportProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const instrumentMap = useMemo(() => {
    const all = plans.flatMap(p => p.instruments || []).filter(i => !i.is_pri_pmi);
    const byCode = new Map(all.filter(i => i.code).map(i => [i.code!.trim(), i]));
    const byId = new Map(all.map(i => [i.id, i]));
    return { byCode, byId };
  }, [plans]);

  const studentMap = useMemo(() => {
    return new Map(students.filter(s => s.student_email).map(s => [s.student_email!.toLowerCase().trim(), s]));
  }, [students]);

  const triggerFilePicker = () => {
    inputRef.current?.click();
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;
    const content = text.replace(/^\uFEFF/, "");

    const pushCell = () => {
      row.push(current);
      current = "";
    };

    const pushRow = () => {
      row.push(current);
      rows.push(row);
      current = "";
      row = [];
    };

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && char === ",") {
        pushCell();
        continue;
      }
      if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && nextChar === "\n") i += 1;
        pushRow();
        continue;
      }
      current += char;
    }
    if (current !== "" || row.length > 0) pushRow();
    return rows;
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus({ type: "parsing", message: "Analizando archivo..." });
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const allRows = parseCsv(text).filter(r => r.some(c => c.trim().length > 0));
        if (allRows.length <= 1) {
          setStatus({ type: "error", message: "El archivo no contiene datos o cabeceras." });
          return;
        }

        const header = allRows[0];
        const dataRows = allRows.slice(1);

        // Identify instruments (columns 6+)
        const instrumentsFound: { id: string; code: string; label: string; maxPoints: number | null }[] = [];
        for (let i = 6; i < header.length; i++) {
          const raw = header[i].trim();
          if (!raw) continue;

          let instId: string | undefined;
          let instCode: string | undefined;

          const idMatch = raw.match(/\|([A-Za-z0-9-]+)$/);
          if (idMatch && instrumentMap.byId.has(idMatch[1])) {
            instId = idMatch[1];
            instCode = instrumentMap.byId.get(instId)?.code;
          } else {
            // Estrategia 1: código numérico al principio (ej. "1.3. Casos prácticos...")
            const numericCodeMatch = raw.match(/^([0-9]+(?:\.[0-9]+)*)/);
            if (numericCodeMatch && instrumentMap.byCode.has(numericCodeMatch[1])) {
              const inst = instrumentMap.byCode.get(numericCodeMatch[1])!;
              instId = inst.id;
              instCode = inst.code;
            }

            // Estrategia 2: primera palabra alfanumérica al principio (ej. "PT1 Proyecto T1...")
            if (!instId) {
              const alphaCodeMatch = raw.match(/^([A-Za-z0-9]+)\s/);
              if (alphaCodeMatch && instrumentMap.byCode.has(alphaCodeMatch[1])) {
                const inst = instrumentMap.byCode.get(alphaCodeMatch[1])!;
                instId = inst.id;
                instCode = inst.code;
              }
            }
          }

          if (instId) {
            const maxMatch = raw.match(/Puntos totales:\s*([0-9]+(?:[.,][0-9]+)?)/i);
            instrumentsFound.push({
              id: instId,
              code: instCode || "??",
              label: raw.split("|")[0].trim(),
              maxPoints: maxMatch ? Number(maxMatch[1].replace(",", ".")) : null,
            });
          }
        }

        const parsedRows: ParsedRow[] = dataRows.map(row => {
          const email = row[2]?.trim().toLowerCase() || "";
          const student = studentMap.get(email);
          const studentName = student ? `${student.last_name || ""}, ${student.student_name}`.trim() : (row[0] || "Estudiante desconocido");
          
          const scores: ParsedRow["scores"] = [];
          instrumentsFound.forEach((inst, idx) => {
            const colIdx = 6 + idx;
            const rawVal = row[colIdx]?.trim();
            if (!rawVal || rawVal === "-") return;

            const numeric = Number(rawVal.replace(",", "."));
            let val = numeric;
            let error: string | undefined;

            if (Number.isNaN(numeric)) {
              error = "Valor no numérico";
            } else {
              if (inst.maxPoints && inst.maxPoints > 0) {
                val = (numeric / inst.maxPoints) * 10;
              }
              if (val < 0 || val > 10) error = "Fuera de rango (0-10)";
            }

            scores.push({
              instrumentId: inst.id,
              label: inst.label,
              value: Number(val.toFixed(2)),
              rawValue: rawVal,
              error
            });
          });

          return {
            studentId: student?.id || "",
            email,
            studentName,
            scores,
            error: !student ? "Alumno no encontrado por email" : undefined
          };
        });

        setPreview({
          fileName: file.name,
          instrumentsFound: instrumentsFound.map(i => ({ id: i.id, code: i.code, label: i.label })),
          rows: parsedRows,
          totalValidScores: parsedRows.reduce((acc, r) => acc + (r.error ? 0 : r.scores.filter(s => !s.error).length), 0)
        });
        setStatus({ type: "idle" });
      } catch (err) {
        setStatus({ type: "error", message: "Error al procesar el CSV." });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    setStatus({ type: "loading", message: "Guardando notas..." });

    const scoreRows = preview.rows
      .filter(r => !r.error)
      .flatMap(r => r.scores.filter(s => !s.error).map(s => ({
        student_id: r.studentId,
        instrument_id: s.instrumentId,
        plan_ce_id: null,
        score_value: s.value
      })));

    try {
      const response = await fetch(`/api/evaluations/${contextId}/import-grades`, {
        method: "POST",
        body: JSON.stringify({ scores: scoreRows }),
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || "Error al guardar");
      }

      setStatus({ type: "success", message: `Se han importado ${scoreRows.length} notas correctamente.` });
      setPreview(null);
      router.refresh();
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={triggerFilePicker}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={status.type === "loading" || status.type === "parsing"}
          >
            {status.type === "parsing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Importar CSV de notas
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span role="button" className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                  <Info className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-3">
                <p className="font-semibold mb-1">Instrucciones de importación:</p>
                <ul className="space-y-1 list-disc pl-3 text-xs">
                  <li>Usa el CSV exportado de la <strong>calificación</strong> de Moodle.</li>
                  <li>Se identifican alumnos por el <strong>Email</strong> (columna C).</li>
                  <li>Los instrumentos deben tener el <strong>código</strong> al principio del nombre.</li>
                  <li>Solo se importarán los instrumentos que existan en la programación.</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {status.type === "success" && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {status.message}
            </span>
          )}
          {status.type === "error" && (
            <span className="text-xs font-medium text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {status.message}
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b pb-3 border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg text-emerald-600">
                <FileUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Vista previa: {preview.fileName}</h3>
                <p className="text-[11px] text-zinc-500">{preview.instrumentsFound.length} instrumentos detectados</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-64 overflow-auto border rounded-lg">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-left border-r w-32">Alumno</th>
                  {preview.instrumentsFound.map(inst => (
                    <th key={inst.id} className="px-2 py-2 text-center border-r min-w-[60px]" title={inst.label}>
                      {inst.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((row, i) => (
                  <tr key={i} className={cn(row.error ? "bg-rose-50/40 dark:bg-rose-900/10" : "hover:bg-zinc-50/50")}>
                    <td className="px-3 py-1.5 border-r font-medium">
                      <div className="flex flex-col">
                        <span className={cn(row.error ? "text-rose-600" : "text-zinc-900 dark:text-zinc-100")}>{row.studentName}</span>
                        {row.error && <span className="text-[10px] text-rose-500 italic">{row.error}</span>}
                      </div>
                    </td>
                    {preview.instrumentsFound.map(inst => {
                      const score = row.scores.find(s => s.instrumentId === inst.id);
                      if (!score) return <td key={inst.id} className="px-2 py-1.5 border-r text-center text-zinc-300">—</td>;
                      return (
                        <td key={inst.id} className={cn("px-2 py-1.5 border-r text-center", score.error && "bg-amber-50 dark:bg-amber-900/10")}>
                          <div className="flex flex-col">
                            <span className={cn("font-semibold", score.error ? "text-amber-600" : "text-emerald-600")}>
                              {score.value}
                            </span>
                            {score.error && <span className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/40 rounded px-0.5 mt-0.5">{score.error}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-zinc-500">
               Se importarán <span className="text-emerald-600 font-bold">{preview.totalValidScores}</span> notas válidas.
               {preview.rows.some(r => r.error) && <span className="text-rose-500 ml-2">({preview.rows.filter(r => r.error).length} alumnos ignorados)</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Cancelar</Button>
              <Button
                onClick={handleConfirmImport}
                disabled={status.type === "loading" || preview.totalValidScores === 0}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {status.type === "loading" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirmar e Importar
              </Button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv, text/csv"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
