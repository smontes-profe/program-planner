"use client";

import { useState, useTransition } from "react";
import { updatePlan } from "@/domain/teaching-plan/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Loader2 } from "lucide-react";
import { type TeachingPlan } from "@/domain/teaching-plan/types";

interface PlanSettingsEditorProps {
  readonly plan: TeachingPlan;
}

export function PlanSettingsEditor({ plan }: PlanSettingsEditorProps) {
  const isClone = Boolean(plan.is_clone || plan.source_plan_id);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState(plan.title);
  const [academicYear, setAcademicYear] = useState(plan.academic_year);
  const [visibility, setVisibility] = useState<"private" | "organization">(
    isClone ? "private" : plan.visibility_scope as "private" | "organization"
  );

  function resetForm() {
    setTitle(plan.title);
    setAcademicYear(plan.academic_year);
    setVisibility(isClone ? "private" : plan.visibility_scope as "private" | "organization");
    setError("");
  }

  function handleOpenChange(v: boolean) {
    if (v) resetForm();
    setOpen(v);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const res = await updatePlan(plan.id, {
        title,
        academic_year: academicYear,
        visibility_scope: isClone ? "private" : visibility,
      });

      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={
        <Button variant="outline" size="sm" className="gap-2" />
      }>
          <Settings2 className="h-4 w-4" /> Configuración
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Configuración de la Programación</SheetTitle>
          <SheetDescription>
            Modifica los metadatos básicos de tu programación.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-8 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="plan-title">Título</Label>
            <Input
              id="plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Programación DAW 2026/2027"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic_year">Año académico</Label>
            <Input
              id="academic_year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              pattern="[0-9]{4}/[0-9]{4}"
              placeholder="2026/2027"
              required
            />
            <p className="text-[11px] text-zinc-400">Formato: YYYY/YYYY (ej. 2026/2027)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility_scope">Visibilidad</Label>
            <select
              id="visibility_scope"
              value={isClone ? "private" : visibility}
              disabled={isClone}
              onChange={(e) => setVisibility(e.target.value as "private" | "organization")}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
            >
              <option value="private">Privada (solo creador)</option>
              {!isClone ? <option value="organization">Público</option> : null}
            </select>
            {isClone ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Las copias de programaciones permanecen siempre privadas.
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400">
                Las programaciones públicas de la organización solo son editables por su creador.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar cambios
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
