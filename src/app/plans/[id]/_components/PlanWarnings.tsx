"use client";

import { AlertTriangle } from "lucide-react";

interface PlanWarningsProps {
  readonly warnings: string[];
}

export function PlanWarnings({ warnings }: PlanWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
            Avisos de configuración ({warnings.length})
          </h3>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-600/80 dark:text-amber-400/70">
            Estos avisos no impiden que la programación se use en Evaluaciones, pero pueden afectar al cálculo de notas.
          </p>
        </div>
      </div>
    </div>
  );
}
