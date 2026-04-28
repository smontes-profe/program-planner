"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";

import { createPlanFromPlan } from "@/domain/teaching-plan/actions";
import { Button } from "@/components/ui/button";

interface ClonePlanButtonProps {
  readonly sourcePlanId: string;
  readonly sourcePlanTitle: string;
  readonly academicYear: string;
  readonly className?: string;
  readonly variant?: "default" | "outline" | "ghost";
  readonly size?: "default" | "sm" | "icon";
}

export function ClonePlanButton({
  sourcePlanId,
  sourcePlanTitle,
  academicYear,
  className,
  variant = "outline",
  size = "sm",
}: ClonePlanButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClone() {
    setError("");
    startTransition(async () => {
      const result = await createPlanFromPlan({
        source_plan_id: sourcePlanId,
        title: `${sourcePlanTitle} (copia)`,
        academic_year: academicYear,
        visibility_scope: "private",
      });

      if (result.ok) {
        router.push(`/plans/${result.data.id}`);
        return;
      }

      setError(result.error);
    });
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant={variant} size={size} className={className} onClick={handleClone} disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
        Clonar como propia
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
