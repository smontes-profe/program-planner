"use client";

import { Trash2 } from "lucide-react";
import { deleteEvaluationContext } from "@/domain/evaluation/actions";

export function DeleteContextButton({ contextId }: { contextId: string }) {
  return (
    <button
      onClick={async () => {
        if (!confirm("¿Eliminar este contexto de evaluación? Esta acción no se puede deshacer.")) return;
        const res = await deleteEvaluationContext(contextId);
        if (res.ok) window.location.reload();
      }}
      className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
      title="Eliminar contexto"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
