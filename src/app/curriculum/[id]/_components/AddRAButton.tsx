"use client";

import { useActionState, useState } from "react";
import { addRA } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

interface AddRAButtonProps {
  readonly templateId: string;
}

export function AddRAButton({ templateId }: AddRAButtonProps) {
  const [open, setOpen] = useState(false);
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const payload = {
        code: formData.get("code") as string,
        description: formData.get("description") as string,
        weight: Number(formData.get("weight")),
      };
      
      const res = await addRA(templateId, payload);
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
        <div className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-background h-8 gap-1.5 px-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
          <Plus className="h-4 w-4" /> Añadir RA
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950">
        <SheetHeader>
          <SheetTitle>Añadir RA</SheetTitle>
          <SheetDescription>Añade un Resultado de Aprendizaje a la plantilla.</SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-6 pt-6 text-zinc-900 dark:text-zinc-50">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" placeholder="RA1" required defaultValue={state.fields?.code} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (%)</Label>
              <Input id="weight" name="weight" type="number" min="1" max="100" defaultValue={state.fields?.weight || "20"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea 
                id="description" 
                name="description" 
                rows={4}
                defaultValue={state.fields?.description}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
                required
              />
            </div>
          </div>
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar RA"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
