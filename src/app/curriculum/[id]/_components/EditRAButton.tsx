"use client";

import { useActionState, useState } from "react";
import { updateRA } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Loader2 } from "lucide-react";

interface EditRAButtonProps {
  readonly templateId: string;
  readonly ra: any;
}

export function EditRAButton({ templateId, ra }: EditRAButtonProps) {
  const [open, setOpen] = useState(false);
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const payload = {
        code: formData.get("code") as string,
        description: formData.get("description") as string,
        weight: 0, // Hidden for now as per previous fix
      };
      
      const res = await updateRA(templateId, ra.id, payload);
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
          className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-600/10 transition-colors cursor-pointer"
          title="Editar RA"
        >
          <Edit2 className="h-4 w-4" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950">
        <SheetHeader>
          <SheetTitle>Editar RA</SheetTitle>
          <SheetDescription>Edita los detalles de este Resultado de Aprendizaje.</SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-6 pt-6 px-4 pb-4 text-zinc-900 dark:text-zinc-50">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" placeholder="RA1" required defaultValue={state.fields?.code ?? ra.code} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea 
                id="description" 
                name="description" 
                rows={4}
                defaultValue={state.fields?.description ?? ra.description}
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
