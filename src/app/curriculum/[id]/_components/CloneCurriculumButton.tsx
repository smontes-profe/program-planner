"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloneCurriculumTemplate } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { CopyPlus, Loader2 } from "lucide-react";

interface CloneCurriculumButtonProps {
  readonly templateId: string;
}

export function CloneCurriculumButton({ templateId }: CloneCurriculumButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClone() {
    setIsPending(true);
    const result = await cloneCurriculumTemplate(templateId);

    if (result.ok) {
      router.push(`/curriculum/${result.data.id}`);
      router.refresh();
      return;
    }

    alert(result.error);
    setIsPending(false);
  }

  return (
    <Button
      type="button"
      onClick={handleClone}
      disabled={isPending}
      className="h-9 bg-emerald-600 px-4 text-white hover:bg-emerald-700"
      size="sm"
    >
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CopyPlus className="mr-2 h-4 w-4" />}
      Importar a mi cuenta
    </Button>
  );
}
