"use client";

import { useActionState, useEffect, useState } from "react";
import { createTemplateDraftAction, updateTemplateDraftAction } from "@/domain/curriculum/actions";
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
  readonly templateId?: string;
  readonly initialData?: any;
}

const visibilityLabels: Record<"private" | "organization", string> = {
  private: "Privada (solo creador)",
  organization: "Organización (mismo centro)",
};

export function CurriculumForm({ regions, organizations, templateId, initialData }: CurriculumFormProps) {
  const router = useRouter();
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      if (templateId) {
        return updateTemplateDraftAction(templateId, prevState, formData);
      }
      return createTemplateDraftAction(prevState, formData);
    },
    { ok: false, error: "" } as any
  );

  // Fully controlled state for all fields
  const [formData, setFormData] = useState({
    module_name: initialData?.module_name || "",
    module_code: initialData?.module_code || "",
    academic_year: initialData?.academic_year || "",
    version: initialData?.version || "v1",
    region_code: initialData?.region_code || "",
    visibility_scope: initialData?.visibility_scope || "organization",
    hours_total: initialData?.hours_total || 0
  });

  // Sync state if form re-renders with new state.fields after error
  useEffect(() => {
    if (state.fields) {
      setFormData(prev => ({
        ...prev,
        module_name: state.fields.module_name ?? prev.module_name,
        module_code: state.fields.module_code ?? prev.module_code,
        academic_year: state.fields.academic_year ?? prev.academic_year,
        version: state.fields.version ?? prev.version,
        region_code: state.fields.region_code ?? prev.region_code,
        visibility_scope: state.fields.visibility_scope ?? prev.visibility_scope,
        hours_total: state.fields.hours_total ?? prev.hours_total
      }));
    }
  }, [state.fields]);

  useEffect(() => {
    if (state.ok && state.data?.id) {
      router.push(`/curriculum/${state.data.id}`);
    }
  }, [state, router]);

  const fieldErrors = state.details || {};

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
            value={formData.region_code} 
            onValueChange={(val) => setFormData(prev => ({ ...prev, region_code: val || "" }))}
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
          value={formData.module_name}
          onChange={handleInputChange}
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
            value={formData.module_code}
            onChange={handleInputChange}
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
            value={formData.academic_year}
            onChange={handleInputChange}
          />
          {fieldErrors.academic_year && <p className="text-xs text-destructive">{fieldErrors.academic_year[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Versión</Label>
          <Input 
            id="version" 
            name="version" 
            value={formData.version}
            onChange={handleInputChange}
            required 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hours_total">Horas Anuales Totales</Label>
          <Input 
            id="hours_total" 
            name="hours_total" 
            type="number"
            min="0"
            value={formData.hours_total}
            onChange={handleInputChange}
            required 
          />
          {fieldErrors.hours_total && <p className="text-xs text-destructive">{fieldErrors.hours_total[0]}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility_scope">Visibilidad</Label>
        <input type="hidden" name="visibility_scope" value={formData.visibility_scope} />
        <Select 
          value={formData.visibility_scope} 
          onValueChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              visibility_scope: (val as "private" | "organization" | null) || "organization",
            }))
          }
        >
          <SelectTrigger id="visibility_scope" className="w-full h-10 border-zinc-200 dark:border-zinc-800">
            <SelectValue>{visibilityLabels[formData.visibility_scope as "private" | "organization"]}</SelectValue>
          </SelectTrigger>
        <SelectContent>
            <SelectItem value="private">Privada (solo creador)</SelectItem>
            <SelectItem value="organization">Organización (mismo centro)</SelectItem>
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
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (templateId ? "Guardar Cambios" : "Crear Borrador")}
        </Button>
      </div>
    </form>
  );
}
