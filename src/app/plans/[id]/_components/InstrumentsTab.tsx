"use client";

import { useState } from "react";
import { type TeachingPlanFull, type PlanInstrument, type InstrumentType } from "@/domain/teaching-plan/types";
import { 
  addPlanInstrument, updatePlanInstrument, deletePlanInstrument 
} from "@/domain/teaching-plan/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Trash2, Loader2, Calculator } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
} from "@/components/ui/tooltip";

interface InstrumentsTabProps {
  readonly plan: TeachingPlanFull;
}

const INSTRUMENT_TYPES: { value: InstrumentType; label: string }[] = ([
  { value: "activity", label: "Actividad" },
  { value: "oral", label: "Defensa Oral" },
  { value: "exam", label: "Examen" },
  { value: "other", label: "Otros" },
  { value: "practice", label: "Práctica" },
  { value: "project", label: "Proyecto" },
] as { value: InstrumentType; label: string }[]).sort((a, b) => a.label.localeCompare(b.label));

function getInstrumentTypeLabel(type: string) {
  return INSTRUMENT_TYPES.find(t => t.value === type)?.label || type;
}

// ─── Instrument Form Component ──────────────────────────────
function InstrumentForm({ plan, initialData, onSubmit, onCancel, isPending, error }: {
  readonly plan: TeachingPlanFull,
  readonly initialData?: PlanInstrument,
  readonly onSubmit: (payload: any, unitIds: string[], raIds: string[], ceWeights: { ceId: string; weight: number }[]) => void,
  readonly onCancel: () => void,
  readonly isPending: boolean,
  readonly error: string
}) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    name: initialData?.name || "",
    type: (initialData?.type as InstrumentType) || "exam",
    description: initialData?.description || "",
  });

  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(
    new Set(initialData?.unit_ids || [])
  );

  const [selectedRas, setSelectedRas] = useState<Set<string>>(
    new Set(initialData?.ra_ids || [])
  );

  const [ceWeights, setCeWeights] = useState<Record<string, number>>(
    (initialData?.ce_weights || []).reduce((acc, cw) => ({
      ...acc,
      [cw.plan_ce_id]: Number(cw.weight)
    }), {})
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightsArray = Object.entries(ceWeights)
      .filter(([ceId, weight]) => {
        const ce = plan.ras.flatMap(ra => ra.ces || []).find(c => c.id === ceId);
        return ce && selectedRas.has(ce.plan_ra_id) && weight > 0;
      })
      .map(([ceId, weight]) => ({ ceId, weight }));

    onSubmit(formData, Array.from(selectedUnits), Array.from(selectedRas), weightsArray);
  };

  const toggleUnit = (uId: string) => {
    const next = new Set(selectedUnits);
    if (next.has(uId)) next.delete(uId);
    else next.add(uId);
    setSelectedUnits(next);
  };

  const toggleRA = (raId: string) => {
    const next = new Set(selectedRas);
    if (next.has(raId)) next.delete(raId);
    else next.add(raId);
    setSelectedRas(next);
  };

  const handleWeightChange = (ceId: string, value: string) => {
    const num = Number.parseFloat(value) || 0;
    setCeWeights(prev => ({ ...prev, [ceId]: num }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-6 px-4 pb-12 overflow-y-auto max-h-[calc(100vh-120px)]">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1 space-y-2">
            <Label htmlFor="inst-code">Código</Label>
            <Input 
              id="inst-code" 
              placeholder="1.1."
              value={formData.code} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })} 
              required 
            />
          </div>
          <div className="col-span-3 space-y-2">
            <Label htmlFor="inst-name">Nombre del Instrumento</Label>
            <Input 
              id="inst-name" 
              placeholder="Ej: Examen Parcial T1"
              value={formData.name} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })} 
              required 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inst-type">Tipo</Label>
          <Select 
            value={formData.type} 
            onValueChange={(v) => { if (v) setFormData({ ...formData, type: v as InstrumentType }) }}
          >
            <SelectTrigger id="inst-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inst-desc">Descripción (opcional)</Label>
          <Textarea 
            id="inst-desc" 
            value={formData.description || ""} 
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })} 
          />
        </div>
      </div>

      {/* UT Selection */}
      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          Unidades de Trabajo vinculadas
        </h4>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {!plan.units?.length && (
            <p className="text-xs text-zinc-400 italic">No hay UTs definidas.</p>
          )}
          {plan.units?.map(unit => (
            <div key={unit.id} className="flex items-center space-x-2 rounded-md border border-zinc-100 dark:border-zinc-900 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <Checkbox 
                id={`ut-${unit.id}`} 
                checked={selectedUnits.has(unit.id)}
                onCheckedChange={() => toggleUnit(unit.id)}
              />
              <Label htmlFor={`ut-${unit.id}`} className="text-xs font-medium cursor-pointer flex-1">
                {unit.code} - {unit.title}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* RA Selection */}
      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          Resultados de Aprendizaje vinculados
        </h4>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {plan.ras.map(ra => (
            <div key={ra.id} className="flex items-center space-x-2 rounded-md border border-zinc-100 dark:border-zinc-900 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <Checkbox 
                id={`ra-${ra.id}`} 
                checked={selectedRas.has(ra.id)}
                onCheckedChange={() => toggleRA(ra.id)}
              />
              <Label htmlFor={`ra-${ra.id}`} className="text-xs font-medium cursor-pointer flex-1">
                RA {ra.code} - {ra.description}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* CE Weights */}
      {selectedRas.size > 0 && (
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Pesos sobre Criterios de Evaluación (%)
          </h4>
          <p className="text-[10px] text-zinc-500 mb-4">
            Indica qué porcentaje de la nota del instrumento aporta a cada CE.
          </p>
          
          <div className="space-y-6">
            {plan.ras.filter(ra => selectedRas.has(ra.id)).map(ra => (
              <div key={ra.id} className="space-y-2">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-1">
                  <Badge variant="neutral" className="text-[10px] font-bold border-zinc-200">RA {ra.code}</Badge>
                  <span className="text-[11px] text-zinc-500 truncate">{ra.description}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 ml-2">
                  {ra.ces?.map(ce => (
                    <div key={ce.id} className="flex items-center gap-3">
                      <Label htmlFor={`ce-${ce.id}`} className="text-[11px] font-mono leading-tight flex-1">
                        <span className="font-bold mr-1">{ce.code})</span>
                        <span className="text-zinc-600 dark:text-zinc-400 font-normal">{ce.description}</span>
                      </Label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input 
                          id={`ce-${ce.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-8 w-16 text-right text-xs"
                          value={ceWeights[ce.id] || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleWeightChange(ce.id, e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-[10px] text-zinc-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="w-1/3" disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" className="w-2/3" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            initialData ? "Guardar Cambios" : "Añadir Instrumento"
          )}
        </Button>
      </div>
    </form>
  )
}

export function InstrumentsTab({ plan }: InstrumentsTabProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<PlanInstrument | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(payload: any, unitIds: string[], raIds: string[], ceWeights: { ceId: string; weight: number }[]) {
    setIsPending(true);
    setError("");
    
    let res;
    if (editingInstrument) {
      res = await updatePlanInstrument(plan.id, editingInstrument.id, payload, unitIds, raIds, ceWeights);
    } else {
      res = await addPlanInstrument(plan.id, payload, unitIds, raIds, ceWeights);
    }

    setIsPending(false);
    if (res.ok) { 
      setOpen(false); 
      setEditingInstrument(null);
      router.refresh(); 
    } else {
      setError(res.error);
    }
  }

  const handleEdit = (instrument: PlanInstrument) => {
    setEditingInstrument(instrument);
    setOpen(true);
  };

  const handleDelete = async (instrument: PlanInstrument) => {
    if (!confirm(`¿Eliminar el instrumento "${instrument.name}"?`)) return;
    setIsPending(true);
    const res = await deletePlanInstrument(plan.id, instrument.id);
    setIsPending(false);
    if (res.ok) router.refresh();
    else alert(res.error);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Instrumentos de Evaluación
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Define cómo vas a evaluar cada CE y qué peso tiene cada instrumento.
            </p>
          </div>
          
          <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingInstrument(null); setError(""); } }}>
            <SheetTrigger>
              <div className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-background h-8 gap-1.5 px-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                <Plus className="h-4 w-4" /> Añadir Instrumento
              </div>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white dark:bg-zinc-950 w-full sm:max-w-3xl">
              <SheetHeader>
                <SheetTitle>{editingInstrument ? "Editar Instrumento" : "Nuevo Instrumento"}</SheetTitle>
                <SheetDescription>
                  Describe el instrumento y asigna los pesos a los Criterios de Evaluación.
                </SheetDescription>
              </SheetHeader>
              <InstrumentForm 
                plan={plan} 
                initialData={editingInstrument || undefined}
                onSubmit={handleSubmit} 
                onCancel={() => setOpen(false)} 
                isPending={isPending} 
                error={error} 
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="w-[80px]">Código</TableHead>
                <TableHead>Instrumento</TableHead>
                <TableHead className="w-[110px]">Tipo</TableHead>
                <TableHead className="w-[120px]">UTs</TableHead>
                <TableHead className="w-[120px]">RAs</TableHead>
                <TableHead>CEs</TableHead>
                <TableHead className="text-right w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.instruments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500 italic">
                    No hay instrumentos definidos.
                  </TableCell>
                </TableRow>
              ) : (
                plan.instruments?.map((inst) => {
                  const unitCodes = (inst.unit_ids || []).map(uId => {
                    return plan.units?.find(u => u.id === uId)?.code || "?";
                  });

                  // We need to find the RA code and description for tooltips
                  const ras = (inst.ra_ids || []).map(raId => {
                    const ra = plan.ras.find(r => r.id === raId);
                    return ra ? { code: ra.code, description: ra.description } : null;
                  }).filter(Boolean);

                  // Filtered weights and their associated CEs
                  const ces = (inst.ce_weights || []).map(cw => {
                    const ce = plan.ras.flatMap(r => r.ces || []).find(c => c.id === cw.plan_ce_id);
                    return ce ? { code: ce.code, description: ce.description, weight: cw.weight } : null;
                  }).filter(Boolean);

                  return (
                    <TableRow key={inst.id}>
                      <TableCell className="font-mono text-xs font-bold text-zinc-400">
                        {inst.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{inst.name}</span>
                          {inst.description && (
                            <span className="text-xs text-zinc-400 truncate max-w-[150px]">{inst.description}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-[11px] h-5">
                          {getInstrumentTypeLabel(inst.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {unitCodes.map(code => (
                            <Badge key={code} variant="outline" className="text-[10px] py-0">{code}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ras.map(ra => (
                            <Tooltip key={ra!.code}>
                              <TooltipTrigger className="cursor-help">
                                <Badge variant="neutral" className="bg-zinc-100 text-[10px] py-0 hover:bg-zinc-200">RA {ra!.code}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>{ra!.description}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {ces.map(ce => (
                            <Tooltip key={ce!.code}>
                              <TooltipTrigger className="cursor-help flex items-center gap-1 group">
                                <span className="text-[11px] font-mono font-bold text-zinc-500 group-hover:text-primary transition-colors">{ce!.code})</span>
                                <span className="text-[10px] text-zinc-400 font-medium">{ce!.weight}%</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-bold border-b border-zinc-700 pb-1 mb-1">Criterio {ce!.code}</p>
                                  <p>{ce!.description}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {ces.length === 0 && <span className="text-zinc-300">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={() => handleEdit(inst)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDelete(inst)} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-4 rounded-xl flex items-start gap-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
            <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Resumen de Cobertura</h4>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/70 mt-1 leading-relaxed">
              Una vez definidos los instrumentos y sus pesos, podrás ver en la pestaña de <strong>Pesos</strong> si has cubierto correctamente el 100% de cada Criterio de Evaluación.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
