"use client";

import { type EvaluationContextFull } from "@/domain/evaluation/types";
import { Badge } from "@/components/ui/badge";

interface GradeMatrixTabProps {
  readonly context: EvaluationContextFull;
}

/**
 * Grade Matrix Tab — placeholder for instrument score entry grid.
 * Will be built in detail when we have instruments linked to contexts.
 */
export function GradeMatrixTab({ context }: GradeMatrixTabProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Matriz de notas</h2>

      {context.students.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-sm">
          <p>Añade alumnos en la pestaña "Alumnado" para poder registrar notas.</p>
        </div>
      ) : context.plans.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-sm space-y-2">
          <p>Vincula al menos una programación publicada para poder configurar instrumentos y registrar notas.</p>
          <p>
            <a href="#context-settings" className="font-semibold text-emerald-600 hover:text-emerald-500">
              Hazlo desde la configuración del contexto
            </a>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
          <p className="text-sm">
            Matriz de notas: filas = alumnos, columnas = instrumentos de cada módulo.
            <br />
            <span className="text-xs text-amber-500">(En desarrollo — próximamente entrada de notas por celda e importación CSV)</span>
          </p>
        </div>
      )}
    </div>
  );
}
