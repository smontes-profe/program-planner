"use client";

import { useState } from "react";
import { deleteRA } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteRAButtonProps {
  readonly templateId: string;
  readonly raId: string;
}

export function DeleteRAButton({ templateId, raId }: DeleteRAButtonProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Seguro que quieres eliminar este RA? Los Criterios asociados también se eliminarán.")) return;
    setIsPending(true);
    await deleteRA(templateId, raId);
    // Modal or state doesn't need to close as it deletes the item
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDelete}
      disabled={isPending}
      className="h-7 w-7 text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
      title="Eliminar RA"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
