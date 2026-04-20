"use client";

import { useActionState, useState } from "react";
import { updateCE } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Loader2 } from "lucide-react";
import { SHEET_CONTENT_CLASS } from "@/lib/ui-constants";

interface EditCEButtonProps {
  readonly templateId: string;
  readonly ce: any;
}

export function EditCEButton({ templateId, ce }: EditCEButtonProps) {
  const [open, setOpen] = useState(false);
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const payload = {
        code: formData.get("code") as string,
        description: formData.get("description") as string,
      };
      
      const res = await updateCE(templateId, ce.id, payload);
      if (res.ok) {
        setOpen(false);
      }
      return res;
    },
    { ok: false, error: "" } as any
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <div 
          className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-600/10 transition-colors cursor-pointer"
          title="Editar CE"
        >
          <Edit2 className="h-3 w-3" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className={SHEET_CONTENT_CLASS}>
        <SheetHeader>
          <SheetTitle>Editar Criterio</SheetTitle>
          <SheetDescription>Edita los detalles de este Criterio de Evaluación.</SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-6 pt-6 px-4 pb-4 text-zinc-900 dark:text-zinc-50">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" placeholder="a" required defaultValue={state.fields?.code ?? ce.code} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea 
                id="description" 
                name="description" 
                rows={4}
                defaultValue={state.fields?.description ?? ce.description}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
                required
              />
            </div>
          </div>
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
