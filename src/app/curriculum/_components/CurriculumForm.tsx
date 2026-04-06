"use client";

import { useActionState, useEffect, useState } from "react";
import { createTemplateDraftAction } from "@/domain/curriculum/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CurriculumFormProps {
  readonly regions: { code: string; name: string }[];
  readonly organizations: { id: string; name: string }[];
}

export function CurriculumForm({ regions, organizations }: CurriculumFormProps) {
  const router = useRouter();
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return createTemplateDraftAction(prevState, formData);
    },
    { ok: false, error: "" } as any
  );

  // Controlled states initialized from state.fields if available
  const [selectedRegion, setSelectedRegion] = useState<string>(state.fields?.region_code || "");
  const [selectedVisibility, setSelectedVisibility] = useState<string>(state.fields?.visibility_scope || "organization");

  // Sync state if form re-renders with new state.fields after error
  useEffect(() => {
    if (state.fields) {
      if (state.fields.region_code) setSelectedRegion(state.fields.region_code);
      if (state.fields.visibility_scope) setSelectedVisibility(state.fields.visibility_scope);
    }
  }, [state.fields]);

  useEffect(() => {
    if (state.ok && state.data?.id) {
      router.push(`/curriculum/${state.data.id}`);
    }
  }, [state, router]);

  const fieldErrors = state.details || {};

  return (
    <form action={formAction} className="space-y-6 text-zinc-900 dark:text-zinc-50">
      {state.error && !state.ok && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Error al guardar</p>
            <p className="opacity-90">{state.error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="organization_id">Organización</Label>
          <input type="hidden" name="organization_id" value={organizations[0]?.id || ""} />
          <Input 
            value={organizations[0]?.name || "Ilerna"} 
            className="border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 cursor-not-allowed"
            readOnly
          />
          {fieldErrors.organization_id && (
            <p className="text-xs text-destructive">{fieldErrors.organization_id[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="region_code">Región (CCAA)</Label>
          <Select 
            name="region_code" 
            value={selectedRegion} 
            onValueChange={(val) => setSelectedRegion(val || "")}
          >
            <SelectTrigger id="region_code" className="w-full h-10 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder="Selecciona región" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.code} value={region.code}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.region_code && (
            <p className="text-xs text-destructive">{fieldErrors.region_code[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="module_name">Nombre del Módulo</Label>
        <Input 
          id="module_name" 
          name="module_name" 
          placeholder="Ej: Programación, Bases de Datos..." 
          className="border-zinc-200 dark:border-zinc-800"
          required
          defaultValue={state.fields?.module_name ?? ""}
        />
        {fieldErrors.module_name && (
          <p className="text-xs text-destructive">{fieldErrors.module_name[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="module_code">Código Módulo</Label>
          <Input 
            id="module_code" 
            name="module_code" 
            placeholder="Ej: 0373" 
            required 
            defaultValue={state.fields?.module_code ?? ""}
          />
          {fieldErrors.module_code && <p className="text-xs text-destructive">{fieldErrors.module_code[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="academic_year">Año Académico</Label>
          <Input 
            id="academic_year" 
            name="academic_year" 
            placeholder="2026/2027" 
            required 
            defaultValue={state.fields?.academic_year ?? ""}
          />
          {fieldErrors.academic_year && <p className="text-xs text-destructive">{fieldErrors.academic_year[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Versión</Label>
          <Input 
            id="version" 
            name="version" 
            defaultValue={state.fields?.version || "v1"} 
            required 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility_scope">Visibilidad</Label>
        <Select 
          name="visibility_scope" 
          value={selectedVisibility} 
          onValueChange={(val) => setSelectedVisibility(val || "organization")}
        >
          <SelectTrigger id="visibility_scope" className="w-full h-10 border-zinc-200 dark:border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Privado (Solo tú y gestores)</SelectItem>
            <SelectItem value="organization">Organización (Mismo centro)</SelectItem>
            <SelectItem value="company">Compañía (Plataforma completa)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 flex items-center justify-end gap-3">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="px-8 min-w-[140px]"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Borrador"}
        </Button>
      </div>
    </form>
  );
}
