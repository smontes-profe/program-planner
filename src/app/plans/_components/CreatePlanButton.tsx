"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlanFromTemplate } from "@/domain/teaching-plan/actions";
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
import { Plus, Loader2 } from "lucide-react";

interface PublishedTemplate {
  id: string;
  module_name: string;
  module_code: string;
  academic_year: string;
  version: string;
  region_code: string;
}

interface CreatePlanButtonProps {
  readonly publishedTemplates: PublishedTemplate[];
}

export function CreatePlanButton({ publishedTemplates }: CreatePlanButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const selectedTemplate = publishedTemplates.find((t) => t.id === selectedTemplateId);

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedTemplateId(id);
    const tpl = publishedTemplates.find((t) => t.id === id);
    setAcademicYear(tpl?.academic_year ?? "");
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createPlanFromTemplate({
        title: formData.get("title") as string,
        source_template_id: formData.get("source_template_id") as string,
        academic_year: formData.get("academic_year") as string,
        visibility_scope: (formData.get("visibility_scope") as "private" | "organization") ?? "private",
      });

      if (res.ok) {
        setOpen(false);
        router.push(`/plans/${res.data.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); setError(""); setSelectedTemplateId(""); setAcademicYear(""); }}>
      <SheetTrigger>
        <div
          id="create-plan-button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Nueva Programación
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nueva Programación</SheetTitle>
          <SheetDescription>
            Elige un currículo publicado como base. Se creará una copia independiente para que trabajes libremente.
          </SheetDescription>
        </SheetHeader>

        {publishedTemplates.length === 0 ? (
          <div className="mt-6 px-4 py-8 text-center text-zinc-500 text-sm">
            <p>No hay currículos publicados disponibles.</p>
            <p className="mt-1 text-xs">Publica al menos un currículo antes de crear una programación.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-6 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="source_template_id">Currículo base</Label>
              <select
                id="source_template_id"
                name="source_template_id"
                required
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
              >
                <option value="">Selecciona un currículo...</option>
                {publishedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.module_name} ({t.module_code} · {t.region_code} · {t.academic_year} · v{t.version})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-title">Título de la programación</Label>
              <Input
                id="plan-title"
                name="title"
                placeholder={
                  selectedTemplate
                    ? `Programación ${selectedTemplate.module_name} ${selectedTemplate.academic_year}`
                    : "Ej: Programación DAW 2026/2027"
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic_year">Año académico</Label>
              <Input
                id="academic_year"
                name="academic_year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                pattern="\d{4}/\d{4}"
                required
              />
              <p className="text-[11px] text-zinc-400">Formato: YYYY/YYYY (ej. 2026/2027)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility_scope">Visibilidad</Label>
              <select
                id="visibility_scope"
                name="visibility_scope"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
              >
                <option value="private">Privada (solo creador)</option>
                <option value="organization">Mi organización</option>
              </select>
            </div>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending || !selectedTemplateId}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Programación"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
