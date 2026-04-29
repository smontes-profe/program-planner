"use client";

import { useState } from "react";
import { archiveTeachingPlan } from "@/domain/teaching-plan/actions";
import { Button } from "@/components/ui/button";
import { Archive, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ArchivePlanButtonProps {
  readonly planId: string;
}

export function ArchivePlanButton({ planId }: ArchivePlanButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleArchive() {
    if (!confirm("¿Seguro que quieres archivar esta programación? Esta acción la ocultará de la lista pero conservará los datos. No se puede archivar si tiene evaluaciones asociadas.")) return;
    setIsPending(true);
    const res = await archiveTeachingPlan(planId);
    if (res.ok) {
      router.push("/plans");
    } else {
      alert(res.error);
      setIsPending(false);
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handleArchive}
      disabled={isPending}
      className="opacity-70 hover:opacity-100 h-9"
      title="Archivar Programación"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
    </Button>
  );
}
