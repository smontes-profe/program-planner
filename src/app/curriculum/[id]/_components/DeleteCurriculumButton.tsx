"use client";

import { useState } from "react";
import { archiveTemplate } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Archive, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteCurriculumButtonProps {
  readonly templateId: string;
}

export function DeleteCurriculumButton({ templateId }: DeleteCurriculumButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("¿Seguro que quieres archivar este currículo? Esta acción lo ocultará de la lista pero conservará los datos. No se puede archivar si tiene programaciones asociadas.")) return;
    setIsPending(true);
    const res = await archiveTemplate(templateId);
    if (res.ok) {
      router.push("/curriculum");
    } else {
      alert(res.error);
      setIsPending(false);
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handleDelete}
      disabled={isPending}
      className="opacity-70 hover:opacity-100 h-9"
      title="Archivar Currículo"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
    </Button>
  );
}
