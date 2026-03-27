"use client";

import { useActionState } from "react";
import { publishTemplateAction } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface PublishButtonProps {
  readonly templateId: string;
}

export function PublishButton({ templateId }: PublishButtonProps) {
  const [state, formAction, isPending] = useActionState(
    async () => {
      const res = await publishTemplateAction(templateId);
      return res;
    }, 
    { ok: false, error: "" } as any
  );

  const errorMessage = state.error || "";

  return (
    <form action={formAction}>
      <Button 
        type="submit" 
        variant="default" 
        size="sm" 
        className="bg-emerald-600 hover:bg-emerald-700 h-9 transition-all active:scale-95 text-white"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Publicar
      </Button>
      {errorMessage && !state.ok && (
        <div className="fixed bottom-4 right-4 bg-destructive text-white p-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-semibold">{errorMessage}</span>
        </div>
      )}
    </form>
  );
}
