"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Notification = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
  missingStudents?: string[];
  missingInstruments?: string[];
  invalidEntries?: { row: number; column: string; value: string }[];
};

interface GradeMatrixCsvImportProps {
  contextId: string;
}

export function GradeMatrixCsvImport({ contextId }: GradeMatrixCsvImportProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Notification>({ type: "idle" });

  const triggerFilePicker = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("grades_csv", file);
    formData.append("context_id", contextId);

    setStatus({ type: "loading", message: "Importando el CSV..." });

    try {
      const response = await fetch(`/api/evaluations/${contextId}/import-grades`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus({ type: "error", message: payload?.error ?? "No se pudo importar el CSV." });
        return;
      }

      setStatus({
        type: "success",
        message: `Importadas ${payload.importedCount} notas.`,
        missingStudents: payload.missingStudents,
        missingInstruments: payload.missingInstruments,
        invalidEntries: payload.invalidEntries,
      });

      router.refresh();
    } catch (error) {
      setStatus({ type: "error", message: "Se produjo un error al subir el archivo." });
    } finally {
      event.target.value = "";
    }
  };

  const hasWarnings =
    (status.missingStudents && status.missingStudents.length > 0) ||
    (status.missingInstruments && status.missingInstruments.length > 0) ||
    (status.invalidEntries && status.invalidEntries.length > 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <button
          type="button"
          onClick={triggerFilePicker}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          disabled={status.type === "loading"}
        >
          {status.type === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importando CSV...
            </>
          ) : (
            "Importar CSV de notas"
          )}
        </button>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          Solo se actualizan los instrumentos que aparecen en el archivo; los demás quedan intactos. Para una correcta importación, asegúrate de que los emails coinciden y que los nombres de los instrumentos incluyen al principio el código usado aquí en la app.
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv, text/csv"
        className="sr-only"
        onChange={handleFileChange}
      />

      {status.type === "error" && status.message && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/60 dark:bg-rose-900/40 dark:text-rose-200">
          {status.message}
        </div>
      )}

      {status.type === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-900/40 dark:text-emerald-200">
          <p>{status.message}</p>
          {hasWarnings && (
            <div className="mt-2 space-y-1 text-rose-600 dark:text-rose-200">
              {status.missingStudents && status.missingStudents.length > 0 && (
                <p>
                  No se encontraron alumnos con estos emails: {status.missingStudents.join(", ")}.
                </p>
              )}
              {status.missingInstruments && status.missingInstruments.length > 0 && (
                <p>Instrumentos desconocidos en la programación: {status.missingInstruments.join(", ")}.</p>
              )}
              {status.invalidEntries && status.invalidEntries.length > 0 && (
                <p>
                  Valores inválidos:{" "}
                  {status.invalidEntries
                    .map(entry => `fila ${entry.row} · ${entry.column} (${entry.value})`)
                    .join("; ")}
                  .
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
