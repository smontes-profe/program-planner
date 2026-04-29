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
import { Plus, Edit2, Trash2, Loader2, Calculator, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InstrumentsTabProps {
  readonly plan: TeachingPlanFull;
  readonly readOnly?: boolean;
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

const COLUMN_SEPARATOR_CLASS = "border-r border-zinc-200 dark:border-zinc-800";

// ─── Instrument Form Component ──────────────────────────────────
function InstrumentForm({ plan, initialData, onSubmit, onCancel, isPending, error }: {
  readonly plan: TeachingPlanFull,
  readonly initialData?: PlanInstrument,
  readonly onSubmit: (
    payload: any,
    unitIds: string[],
    raCoverages: { raId: string; coveragePercent: number }[],
    ceWeights: { ceId: string; weight: number }[]
  ) => void,
  readonly onCancel: () => void,
  readonly isPending: boolean,
  readonly error: string
}) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    name: initialData?.name || "",
    type: (initialData?.type as InstrumentType) || "exam",
    is_pri_pmi: initialData?.is_pri_pmi || false,
    description: initialData?.description || "",
  });

  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(
    new Set(initialData?.unit_ids || [])
  );

  // RA coverage: raId -> coveragePercent
  const [raCoverages, setRaCoverages] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const rc of initialData?.ra_coverages || []) {
      initial[rc.plan_ra_id] = Number(rc.coverage_percent) || 0;
    }
    // Also handle legacy ra_ids without coverage
    for (const raId of initialData?.ra_ids || []) {
      if (!(raId in initial)) {
        initial[raId] = 0;
      }
    }
    return initial;
  });

  const selectedRas = new Set(Object.keys(raCoverages));

  // CE weights: ceId -> weight (percentage within the RA)
  const [ceWeights, setCeWeights] = useState<Record<string, number>>(
    (initialData?.ce_weights || []).reduce((acc, cw) => ({
      ...acc,
      [cw.plan_ce_id]: Number(cw.weight)
    }), {})
  );

  const [instrumentCeWeightAuto, setInstrumentCeWeightAuto] = useState<boolean>(initialData?.ce_weight_auto ?? true);
  const ceWeightAutoEnabled = plan.ce_weight_auto && instrumentCeWeightAuto;
  const [validationError, setValidationError] = useState("");

  const seedManualCeWeightsForRa = (raId: string, currentWeights: Record<string, number>) => {
    const ra = plan.ras.find((r) => r.id === raId);
    if (!ra?.ces) return currentWeights;

    const nextWeights = { ...currentWeights };
    for (const ce of ra.ces) {
      if (nextWeights[ce.id] === undefined) {
        nextWeights[ce.id] = Number(ce.weight_in_ra) || 0;
      }
    }
    return nextWeights;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!formData.is_pri_pmi && !ceWeightAutoEnabled) {
      const invalidRas = plan.ras
        .filter((ra) => selectedRas.has(ra.id))
        .filter((ra) => Math.abs(getCeWeightSum(ra.id) - 100) > 0.1)
        .map((ra) => `RA ${ra.code}`);

      if (invalidRas.length > 0) {
        setValidationError(
          `Los pesos manuales de CE deben sumar 100% en cada RA (${invalidRas.join(", ")}).`
        );
        return;
      }
    }

    // Build RA coverages array
    const raCoveragesArray = Object.entries(raCoverages)
      .filter(([, percent]) => percent >= 0)
      .map(([raId, coveragePercent]) => ({
        raId,
        coveragePercent: formData.is_pri_pmi ? 0 : coveragePercent
      }));

    // Build CE weights array
    let weightsArray: { ceId: string; weight: number }[];

    if (formData.is_pri_pmi) {
      weightsArray = [];
    } else if (ceWeightAutoEnabled) {
      // When automation is ON, compute CE weights from RA coverage × CE weight_in_ra
      weightsArray = [];
      for (const { raId, coveragePercent } of raCoveragesArray) {
        const ra = plan.ras.find(r => r.id === raId);
        if (!ra?.ces) continue;
        for (const ce of ra.ces) {
          const ceShareNormalized = (Number(ce.weight_in_ra) || 0) / 100;
          const derivedWeight = coveragePercent * ceShareNormalized;
          if (derivedWeight > 0) {
            weightsArray.push({ ceId: ce.id, weight: Number(derivedWeight.toFixed(4)) });
          }
        }
      }
    } else {
      // Manual mode: use the weights the user entered
      weightsArray = Object.entries(ceWeights)
        .filter(([ceId]) => {
          const ce = plan.ras.flatMap(ra => ra.ces || []).find(c => c.id === ceId);
          return ce && selectedRas.has(ce.plan_ra_id);
        })
        .filter(([, weight]) => weight > 0)
        .map(([ceId, weight]) => ({ ceId, weight }));
    }

    onSubmit(
      {
        ...formData,
        ce_weight_auto: instrumentCeWeightAuto,
      },
      formData.is_pri_pmi ? [] : Array.from(selectedUnits),
      raCoveragesArray,
      weightsArray
    );
  };

  const toggleUnit = (uId: string) => {
    const next = new Set(selectedUnits);
    if (next.has(uId)) next.delete(uId);
    else next.add(uId);
    setSelectedUnits(next);
  };

  const toggleRA = (raId: string) => {
    const next = { ...raCoverages };
    if (raId in next) {
      delete next[raId];
      // Also clear CE weights for this RA's CEs
      const ra = plan.ras.find(r => r.id === raId);
      if (ra?.ces) {
        const newCeWeights = { ...ceWeights };
        for (const ce of ra.ces) {
          delete newCeWeights[ce.id];
        }
        setCeWeights(newCeWeights);
      }
    } else {
      next[raId] = 0;
      if (!ceWeightAutoEnabled) {
        setCeWeights((current) => seedManualCeWeightsForRa(raId, current));
      }
    }
    setRaCoverages(next);
    setValidationError("");
  };

  const handleRaCoverageChange = (raId: string, value: string) => {
    const num = Number.parseFloat(value) || 0;
    setRaCoverages(prev => ({ ...prev, [raId]: Math.min(100, Math.max(0, num)) }));
    setValidationError("");
  };

  const handleCeWeightChange = (ceId: string, value: string) => {
    const num = Number.parseFloat(value) || 0;
    setCeWeights(prev => ({ ...prev, [ceId]: num }));
    setValidationError("");
  };

  const handleCeWeightAutoToggle = (checked: boolean) => {
    setInstrumentCeWeightAuto(checked);
    setValidationError("");

    if (!checked) {
      setCeWeights((current) => {
        let nextWeights = { ...current };
        for (const raId of selectedRas) {
          nextWeights = seedManualCeWeightsForRa(raId, nextWeights);
        }
        return nextWeights;
      });
    }
  };

  // Helper: compute remaining coverage for a RA as a signed balance.
  const getRemainingCoverage = (raId: string): number => {
    const otherInstrumentsCoverage = (plan.instruments || [])
      .filter(inst => !inst.is_pri_pmi && inst.id !== initialData?.id)
      .reduce((sum, inst) => {
        const rc = (inst.ra_coverages || []).find(r => r.plan_ra_id === raId);
        return sum + (Number(rc?.coverage_percent) || 0);
      }, 0);
    const currentCoverage = raCoverages[raId] ?? 0;
    return 100 - otherInstrumentsCoverage - currentCoverage;
  };

  // Helper: compute the CE sum for a given RA
  const getCeWeightSum = (raId: string): number => {
    const ra = plan.ras.find(r => r.id === raId);
    if (!ra?.ces) return 0;
    return ra.ces.reduce((sum, ce) => sum + (ceWeights[ce.id] || 0), 0);
  };

  // Helper: check if automation weights are valid for a given RA
  const isAutoWeightsValid = (raId: string): boolean => {
    const ra = plan.ras.find(r => r.id === raId);
    if (!ra?.ces || ra.ces.length === 0) return false;
    const total = ra.ces.reduce((sum, ce) => sum + (Number(ce.weight_in_ra) || 0), 0);
    return Math.abs(total - 100) < 0.1;
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
              <SelectValue>
                {getInstrumentTypeLabel(formData.type)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2">
          <Checkbox
            id="inst-pri-pmi"
            checked={formData.is_pri_pmi}
            onCheckedChange={(checked) => setFormData({ ...formData, is_pri_pmi: Boolean(checked) })}
          />
          <div className="space-y-0.5">
            <Label htmlFor="inst-pri-pmi" className="cursor-pointer">
              Instrumento especial PRI/PMI
            </Label>
            <p className="text-[11px] text-zinc-500">
              Re-evaluaciÃ³n individual por RA. Sin pesos RA/CE y fuera de la matriz estÃ¡ndar.
            </p>
          </div>
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
      {!formData.is_pri_pmi && (
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
      )}

      {/* RA Selection + Coverage Percent */}
      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          Resultados de Aprendizaje vinculados
        </h4>
        <p className="text-[10px] text-zinc-500 mb-2">
          Marca los RAs que evalúa este instrumento e indica qué porcentaje de la nota del RA aporta.
        </p>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {plan.ras.map(ra => (
            <div key={ra.id} className="rounded-md border border-zinc-100 dark:border-zinc-900 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id={`ra-${ra.id}`} 
                  checked={selectedRas.has(ra.id)}
                  onCheckedChange={() => toggleRA(ra.id)}
                />
                <Label htmlFor={`ra-${ra.id}`} className="text-xs font-medium cursor-pointer flex-1">
                  RA {ra.code} - {ra.description}
                </Label>
                {!formData.is_pri_pmi && selectedRas.has(ra.id) && (
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const remaining = getRemainingCoverage(ra.id);
                      const isBalanced = Math.abs(remaining) < 0.1;
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded",
                              isBalanced
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : remaining < 0
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            )}>
                              {remaining > 0
                                ? `${remaining.toFixed(0)}% libre`
                                : isBalanced
                                  ? "100% ✓"
                                  : `${Math.abs(remaining).toFixed(0)}% exceso`}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Saldo del RA tras sumar la cobertura del resto de instrumentos
                          </TooltipContent>
                        </Tooltip>
                      );
                    })()}
                    <Input 
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className="h-7 w-16 text-right text-xs font-mono"
                      value={raCoverages[ra.id] ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRaCoverageChange(ra.id, e.target.value)}
                      placeholder="0"
                      aria-label={`Porcentaje de cobertura del RA ${ra.code}`}
                    />
                    <span className="text-[10px] text-zinc-400">%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CE Weights */}
      {selectedRas.size > 0 && !formData.is_pri_pmi && (
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Pesos sobre Criterios de Evaluación (%)
            {plan.ce_weight_auto && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] gap-1",
                  ceWeightAutoEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                )}
              >
                {ceWeightAutoEnabled ? <><Zap className="h-3 w-3" /> Automatizado</> : "Manual"}
              </Badge>
            )}
          </h4>
          {plan.ce_weight_auto ? (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="inst-ce-auto"
                  checked={instrumentCeWeightAuto}
                  onCheckedChange={(checked) => handleCeWeightAutoToggle(Boolean(checked))}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="inst-ce-auto" className="cursor-pointer text-xs font-medium">
                    Automatizar los CEs de este instrumento
                  </Label>
                  <p className="text-[10px] text-zinc-500">
                    Si la desactivas, podrás fijar manualmente los porcentajes de cada CE para este instrumento.
                    Los porcentajes de CEs dentro de cada RA deben sumar 100%.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 mb-4">
              La automatización global de CEs está desactivada, así que este instrumento se edita manualmente.
              Los porcentajes de CEs dentro de cada RA deben sumar 100%.
            </p>
          )}
          {ceWeightAutoEnabled ? (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-4">
              Los pesos de CE están definidos en la pestaña de Pesos y se aplican automáticamente.
              El porcentaje efectivo de cada CE = (% del RA) × (% del CE dentro del RA).
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500 mb-4">
              Indica qué porcentaje de la nota del instrumento aporta a cada CE.
            </p>
          )}
          
          <div className="space-y-6">
            {plan.ras.filter(ra => selectedRas.has(ra.id)).map(ra => {
              const raPercent = raCoverages[ra.id] || 0;
              const autoValid = isAutoWeightsValid(ra.id);
              const manualSum = getCeWeightSum(ra.id);
              const manualValid = Math.abs(manualSum - 100) < 0.1;

              return (
                <div key={ra.id} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-1">
                    <Badge variant="neutral" className="text-[10px] font-bold border-zinc-200">RA {ra.code}</Badge>
                    <span className="text-[11px] text-zinc-500 truncate">{ra.description}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 ml-auto shrink-0">
                      {raPercent}% del RA
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 ml-2">
                    {ra.ces?.map(ce => {
                      const autoWeight = Number(ce.weight_in_ra) || 0;
                      const effectivePercent = ceWeightAutoEnabled
                        ? Number(((raPercent * autoWeight) / 100).toFixed(4))
                        : 0;

                      return (
                        <div key={ce.id} className="flex items-center gap-3">
                          <Label htmlFor={`ce-${ce.id}`} className="text-[11px] font-mono leading-tight flex-1">
                            <span className="font-bold mr-1">{ce.code})</span>
                            <span className="text-zinc-600 dark:text-zinc-400 font-normal">{ce.description}</span>
                          </Label>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {ceWeightAutoEnabled ? (
                              // Automated: show derived value, disabled
                              <div className="flex items-center gap-1">
                                <Input 
                                  id={`ce-${ce.id}`}
                                  type="number"
                                  className="h-8 w-16 text-right text-xs bg-zinc-50 dark:bg-zinc-800 cursor-not-allowed opacity-60"
                                  value={autoWeight}
                                  disabled
                                  aria-label={`Peso automatizado del CE ${ce.code}`}
                                />
                                <span className="text-[10px] text-zinc-400">%</span>
                                {autoValid && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-[9px] text-emerald-500 font-mono ml-1">
                                        ={effectivePercent.toFixed(2)}%
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {raPercent}% (RA) × {autoWeight}% (CE) = {effectivePercent.toFixed(2)}% del RA
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              // Manual: editable input
                              <>
                                <Input 
                                  id={`ce-${ce.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="h-8 w-16 text-right text-xs"
                                  value={ceWeights[ce.id] || ""}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCeWeightChange(ce.id, e.target.value)}
                                  placeholder="0"
                                />
                                <span className="text-[10px] text-zinc-400">%</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Validation feedback per RA */}
                  {ceWeightAutoEnabled ? (
                    !autoValid && (
                      <p className="text-[10px] text-amber-600 ml-2">
                        ⚠ Los pesos de CE para este RA no suman 100% en la pestaña de Pesos.
                        Configúralos allí para que la automatización funcione.
                      </p>
                    )
                  ) : (
                    ra.ces && ra.ces.length > 0 && (
                      <div className="ml-2 flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-mono font-bold",
                          manualValid ? "text-emerald-600" : manualSum > 0 ? "text-amber-600" : "text-zinc-400"
                        )}>
                          Suma: {manualSum.toFixed(2)}%
                          {manualValid ? " ✓" : manualSum > 0 ? " (debe ser 100%)" : ""}
                        </span>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(validationError || error) && (
        <p className="text-xs text-destructive">{validationError || error}</p>
      )}
      
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

export function InstrumentsTab({ plan, readOnly = false }: InstrumentsTabProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<PlanInstrument | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    payload: any,
    unitIds: string[],
    raCoverages: { raId: string; coveragePercent: number }[],
    ceWeights: { ceId: string; weight: number }[]
  ) {
    setIsPending(true);
    setError("");
    
    let res;
    if (editingInstrument) {
      res = await updatePlanInstrument(plan.id, editingInstrument.id, payload, unitIds, raCoverages, ceWeights);
    } else {
      res = await addPlanInstrument(plan.id, payload, unitIds, raCoverages, ceWeights);
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

  const handleTypeChange = async (instrumentId: string, newType: string) => {
    if (readOnly) return;
    const res = await updatePlanInstrument(plan.id, instrumentId, { type: newType as InstrumentType });
    if (res.ok) router.refresh();
  };

  const handleDelete = async (instrument: PlanInstrument) => {
    if (readOnly) return;
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
            {!readOnly ? (
              <SheetTrigger>
                <div className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-background h-8 gap-1.5 px-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                  <Plus className="h-4 w-4" /> Añadir Instrumento
                </div>
              </SheetTrigger>
            ) : null}
            <SheetContent side="right" className="bg-white dark:bg-zinc-950 w-full sm:max-w-3xl">
              <SheetHeader>
                <SheetTitle>{editingInstrument ? "Editar Instrumento" : "Nuevo Instrumento"}</SheetTitle>
                <SheetDescription>
                  Describe el instrumento y asigna los pesos a los Criterios de Evaluación.
                </SheetDescription>
              </SheetHeader>
              <InstrumentForm 
                key={editingInstrument?.id || "new"}
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
                <TableHead className={cn("w-[80px]", COLUMN_SEPARATOR_CLASS)}>Código</TableHead>
                <TableHead className={COLUMN_SEPARATOR_CLASS}>Instrumento</TableHead>
                <TableHead className={cn("w-[90px]", COLUMN_SEPARATOR_CLASS)}>Tipo</TableHead>
                <TableHead className={cn("w-[100px]", COLUMN_SEPARATOR_CLASS)}>UTs</TableHead>
                <TableHead className={cn("w-[140px]", COLUMN_SEPARATOR_CLASS)}>RAs (cobertura)</TableHead>
                <TableHead className={COLUMN_SEPARATOR_CLASS}>CEs</TableHead>
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
                (plan.instruments || [])
                  .sort((a, b) => {
                    const codeA = a.code || "";
                    const codeB = b.code || "";
                    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                  })
                  .map((inst) => {
                  const unitCodes = (inst.unit_ids || []).map(uId => {
                    const unit = plan.units?.find(u => u.id === uId);
                    return { id: uId, code: unit?.code || "?" };
                  });

                  // RA info with coverage percent — include RA id for unique key
                  const rasWithCoverage = (inst.ra_coverages || []).map(rc => {
                    const ra = plan.ras.find(r => r.id === rc.plan_ra_id);
                    return ra ? { id: ra.id, code: ra.code, description: ra.description, coverage: rc.coverage_percent } : null;
                  }).filter(Boolean);

                  // Fallback: legacy ra_ids without coverage data
                  if (rasWithCoverage.length === 0 && inst.ra_ids?.length) {
                    for (const raId of inst.ra_ids) {
                      const ra = plan.ras.find(r => r.id === raId);
                      if (ra) rasWithCoverage.push({ id: ra.id, code: ra.code, description: ra.description, coverage: 0 });
                    }
                  }

                  // Filtered weights and their associated CEs — include CE id for unique key
                  const ces = (inst.ce_weights || []).map(cw => {
                    const ce = plan.ras.flatMap(r => r.ces || []).find(c => c.id === cw.plan_ce_id);
                    // Find which RA this CE belongs to
                    const parentRA = plan.ras.find(r => r.ces?.some(c => c.id === cw.plan_ce_id));
                    return ce ? { id: ce.id, code: ce.code, description: ce.description, weight: cw.weight, raId: parentRA?.id, raCode: parentRA?.code } : null;
                  }).filter(Boolean);

                  // Group CEs by RA
                  const cesByRA = new Map<string, typeof ces>();
                  for (const ce of ces) {
                    if (!ce) continue;
                    const raId = ce.raId || "unknown";
                    if (!cesByRA.has(raId)) cesByRA.set(raId, []);
                    cesByRA.get(raId)!.push(ce);
                  }

                  return (
                    <TableRow key={inst.id}>
                      <TableCell className={cn("font-mono text-xs font-bold text-zinc-400", COLUMN_SEPARATOR_CLASS)}>
                        {inst.code}
                      </TableCell>
                      <TableCell className={cn("min-w-0", COLUMN_SEPARATOR_CLASS)}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]"
                              title={inst.name}
                            >
                              {inst.name}
                            </span>
                            {inst.is_pri_pmi && (
                              <Badge variant="warning" className="text-[10px] py-0">PRI/PMI</Badge>
                            )}
                          </div>
                          {inst.description && (
                            <span className="text-xs text-zinc-400 truncate max-w-[220px]" title={inst.description}>
                              {inst.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={COLUMN_SEPARATOR_CLASS}>
                        {readOnly ? (
                          <span className="px-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                            {getInstrumentTypeLabel(inst.type)}
                          </span>
                        ) : (
                          <Select value={inst.type} onValueChange={(v) => v && handleTypeChange(inst.id, v)}>
                            <SelectTrigger className="h-6 w-auto min-w-[90px] border-0 bg-transparent shadow-none px-1 py-0 text-[11px] font-medium focus:ring-0 focus:outline-none">
                              <SelectValue>{getInstrumentTypeLabel(inst.type)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {INSTRUMENT_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className={cn("max-w-[100px] min-w-0", COLUMN_SEPARATOR_CLASS)}>
                        <div className="flex flex-wrap gap-1">
                          {unitCodes.map(uc => (
                            <Badge key={uc.id} variant="outline" className="text-[10px] py-0">{uc.code}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className={cn("max-w-[140px] min-w-0", COLUMN_SEPARATOR_CLASS)}>
                        <div className="flex flex-wrap gap-1">
                          {rasWithCoverage.map(ra => (
                            <Tooltip key={ra!.id}>
                              <TooltipTrigger className="cursor-help">
                                <Badge variant="neutral" className="bg-zinc-100 text-[10px] py-0 hover:bg-zinc-200 gap-0.5">
                                  RA {ra!.code}
                                  {!inst.is_pri_pmi && ra!.coverage > 0 && (
                                    <span className="text-emerald-600 font-bold ml-0.5">{ra!.coverage}%</span>
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-bold">{ra!.description}</p>
                                  {!inst.is_pri_pmi && ra!.coverage > 0 && (
                                    <p className="text-emerald-400">Cobertura: {ra!.coverage}% de la nota del RA</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className={cn("min-w-0", COLUMN_SEPARATOR_CLASS)}>
                        <div className="flex flex-col gap-1.5">
                          {inst.is_pri_pmi ? (
                            <span className="text-[11px] text-zinc-400">No aplica (PRI/PMI)</span>
                          ) : ces.length > 0 ? (
                            Array.from(cesByRA.entries()).map(([raId, raCes]) => (
                              <div key={raId} className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                                  RA {raCes[0]?.raCode}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {raCes.map(ce => (
                                    <Tooltip key={ce!.id}>
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
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!readOnly ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={() => handleEdit(inst)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDelete(inst)} disabled={isPending}>
                              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        ) : null}
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
              Cada instrumento especifica qué porcentaje de la nota de cada RA cubre.
              Los pesos de los CEs {plan.ce_weight_auto ? "se calculan automáticamente desde la pestaña de Pesos, salvo en los instrumentos que se pasen a manual" : "se asignan manualmente por instrumento"}.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
