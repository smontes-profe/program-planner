"use client";

import { useState } from "react";
import { type PlanStatus } from "@/domain/teaching-plan/types";
import { publishPlan, unpublishPlan } from "@/domain/teaching-plan/actions";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Archive, AlertCircle } from "lucide-react";

interface PlanStatusControlsProps {
  readonly planId: string;
  readonly initialStatus: PlanStatus;
}

export function PlanStatusControls({ planId, initialStatus }: PlanStatusControlsProps) {
  const [status, setStatus] = useState<PlanStatus>(initialStatus);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePublish = async () => {
    setPending(true);
    setMessage(null);
    try {
      const result = await publishPlan(planId);
      if (result.ok) {
        setStatus("published");
        setMessage({ type: "success", text: "Programación publicada. Ya está disponible para su uso en Evaluaciones." });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } finally {
      setPending(false);
    }
  };

  const handleUnpublish = async () => {
    setPending(true);
    setMessage(null);
    try {
      const result = await unpublishPlan(planId);
      if (result.ok) {
        setStatus("draft");
        setMessage({ type: "success", text: "Programación despublicada. Ha vuelto a estado de borrador." });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {status === "draft" ? (
          <Button
            onClick={handlePublish}
            disabled={pending}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Publicar programación
          </Button>
        ) : (
          <Button
            onClick={handleUnpublish}
            disabled={pending}
            variant="outline"
            size="sm"
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            Despublicar (volver a borrador)
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400"
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
