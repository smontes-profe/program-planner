"use client";

import { useState, useTransition, useEffect } from "react";
import { type TeachingPlanFull, type PlanTeachingUnit } from "@/domain/teaching-plan/types";
import { 
  addPlanUnit, updatePlanUnit, deletePlanUnit,
  updatePlanUnitOrder 
} from "@/domain/teaching-plan/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Trash2, Loader2, Clock, GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
} from "@/components/ui/tooltip";
import { PlanHoursEditor } from "./PlanHoursEditor";
import { cn } from "@/lib/utils";

// DnD Kit Imports
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface UnitsTabProps {
  readonly plan: TeachingPlanFull;
}

function calculateTotalHours(units: PlanTeachingUnit[] | undefined) {
  if (!units) return 0;
  return units.reduce((acc, unit) => acc + (unit.hours || 0), 0);
}

// ─── Sortable UT Row ──────────────────────────────────────
function SortableUTRow({ unit, plan, index, sortedUnits }: { 
  unit: PlanTeachingUnit; 
  plan: TeachingPlanFull;
  index: number;
  sortedUnits: PlanTeachingUnit[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "var(--zinc-100)" : undefined,
  };

  function handleHoursChange(newHours: number) {
    if (newHours === unit.hours) return;
    startTransition(async () => {
      const res = await updatePlanUnit(plan.id, unit.id, { hours: newHours });
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  function toggleTrimester(t: 1 | 2 | 3) {
    const key = `active_t${t}` as "active_t1" | "active_t2" | "active_t3";
    const newValue = !unit[key];
    
    // Validate at least one trimester
    const t1 = t === 1 ? newValue : unit.active_t1;
    const t2 = t === 2 ? newValue : unit.active_t2;
    const t3 = t === 3 ? newValue : unit.active_t3;
    
    if (!t1 && !t2 && !t3) {
      alert("La unidad debe pertenecer al menos a un trimestre.");
      return;
    }

    startTransition(async () => {
      const res = await updatePlanUnit(plan.id, unit.id, { 
        active_t1: t1, 
        active_t2: t2, 
        active_t3: t3 
      });
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  const rasWithData = (unit.ra_ids || []).map(rId => {
    return plan.ras.find(r => r.id === rId);
  }).filter(Boolean);

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "group relative", 
        isDragging && "shadow-md",
        isPending && "bg-zinc-50/50 dark:bg-zinc-900/40"
      )}
    >
      <TableCell className="w-[40px]">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-300 hover:text-zinc-500">
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium min-w-[200px]">
        <div className="flex flex-col">
          <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{unit.code}</span>
          <span className="text-zinc-500 dark:text-zinc-400 text-xs truncate max-w-[250px]">{unit.title}</span>
        </div>
      </TableCell>
      <TableCell className="text-center w-[100px]">
        <div className="flex items-center justify-center gap-1 group/input">
          <input
            type="number"
            min={0}
            defaultValue={unit.hours}
            onBlur={(e) => handleHoursChange(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleHoursChange(Number((e.target as HTMLInputElement).value));
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={isPending}
            className={cn(
              "w-12 h-8 text-center text-sm font-mono font-bold rounded-md border border-transparent",
              "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-200 dark:focus:border-zinc-700",
              "transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500",
              isPending && "opacity-50"
            )}
          />
          {isPending && <Loader2 className="h-3 w-3 animate-spin text-emerald-600 absolute right-4" />}
        </div>
      </TableCell>
      <TableCell className="text-center w-[120px]">
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3].map((t) => {
            const key = `active_t${t}` as "active_t1" | "active_t2" | "active_t3";
            const active = unit[key];
            return (
              <button
                key={t}
                onClick={() => toggleTrimester(t as 1 | 2 | 3)}
                disabled={isPending}
                className={cn(
                  "w-7 h-7 rounded-md text-[10px] font-bold transition-all border",
                  active 
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-zinc-400"
                )}
              >
                T{t}
              </button>
            )
          })}
        </div>
      </TableCell>
      <TableCell className="text-zinc-600 dark:text-zinc-400 text-sm">
        <div className="flex flex-wrap gap-1">
          {rasWithData.map(ra => (
            <Tooltip key={ra!.id}>
              <TooltipTrigger>
                <div className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 cursor-help hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  RA{ra!.code}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs z-[9999] shadow-xl border border-zinc-200 dark:border-zinc-800">
                <p className="text-xs">{ra!.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {unit.ra_ids?.length === 0 && <span className="text-zinc-300">-</span>}
        </div>
      </TableCell>
      <TableCell className="text-right text-zinc-400">
        <UTItemActions plan={plan} unit={unit} />
      </TableCell>
    </TableRow>
  );
}

// ─── UT Form Component ─────────────────────────────────────
function UTForm({ plan, initialData, onSubmit, onCancel, isPending, error }: {
  plan: TeachingPlanFull,
  initialData?: PlanTeachingUnit,
  onSubmit: (data: { code: string; title: string; active_t1: boolean; active_t2: boolean; active_t3: boolean; hours: number }, raIds: string[]) => void,
  onCancel: () => void,
  isPending: boolean,
  error: string
}) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    title: initialData?.title || "",
    active_t1: initialData?.active_t1 ?? false,
    active_t2: initialData?.active_t2 ?? false,
    active_t3: initialData?.active_t3 ?? false,
    hours: initialData?.hours || 0,
  });

  const [selectedRAs, setSelectedRAs] = useState<Set<string>>(
    new Set(initialData?.ra_ids || [])
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      hours: Number(formData.hours)
    }, Array.from(selectedRAs));
  };

  const toggleRA = (raId: string) => {
    const next = new Set(selectedRAs);
    if (next.has(raId)) next.delete(raId);
    else next.add(raId);
    setSelectedRAs(next);
  };

  const textareaClass = "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-6 px-4 pb-12 overflow-y-auto max-h-[calc(100vh-120px)]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ut-code">Código (ej: UT 1)</Label>
            <Input 
              id="ut-code" 
              value={formData.code} 
              onChange={e => setFormData({ ...formData, code: e.target.value })} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ut-hours">Horas</Label>
            <Input 
              id="ut-hours" 
              type="number" 
              min="0"
              value={formData.hours} 
              onChange={e => setFormData({ ...formData, hours: Number(e.target.value) })} 
              required 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ut-title">Título de la Unidad</Label>
          <Input 
            id="ut-title" 
            value={formData.title} 
            onChange={e => setFormData({ ...formData, title: e.target.value })} 
            required 
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label>Trimestres en los que se imparte</Label>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="t1" checked={formData.active_t1} onCheckedChange={(c) => setFormData(p => ({ ...p, active_t1: !!c }))} />
              <Label htmlFor="t1" className="cursor-pointer">T1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="t2" checked={formData.active_t2} onCheckedChange={(c) => setFormData(p => ({ ...p, active_t2: !!c }))} />
              <Label htmlFor="t2" className="cursor-pointer">T2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="t3" checked={formData.active_t3} onCheckedChange={(c) => setFormData(p => ({ ...p, active_t3: !!c }))} />
              <Label htmlFor="t3" className="cursor-pointer">T3</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h4 className="text-sm font-semibold">Resultados de Aprendizaje cubiertos</h4>
        <div className="space-y-2 mt-3 block">
          {plan.ras.length === 0 && (
            <p className="text-xs text-zinc-400 italic">No hay RAs definidos en la programación.</p>
          )}
          {plan.ras.map(ra => (
            <div key={ra.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-zinc-200 dark:border-zinc-800 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <Checkbox 
                id={`ra-${ra.id}`} 
                checked={selectedRAs.has(ra.id)}
                onCheckedChange={() => toggleRA(ra.id)}
              />
              <div className="space-y-1 leading-none py-0.5 cursor-pointer flex-1" onClick={() => toggleRA(ra.id)}>
                <Label htmlFor={`ra-${ra.id}`} className="text-sm font-semibold cursor-pointer">
                  RA {ra.code}
                </Label>
                <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                  {ra.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="w-1/3" disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" className="w-2/3" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? "Guardar Cambios" : "Añadir UT")}
        </Button>
      </div>
    </form>
  )
}

function AddUTButton({ plan }: { readonly plan: TeachingPlanFull }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: any, raIds: string[]) {
    setIsPending(true);
    const res = await addPlanUnit(plan.id, data, raIds);
    setIsPending(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError(res.error);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); setError(""); }}>
      <SheetTrigger>
        <div className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-background h-8 gap-1.5 px-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
          <Plus className="h-4 w-4" /> Añadir UT
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950 w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nueva Unidad de Trabajo</SheetTitle>
          <SheetDescription>Añade una UT al plan.</SheetDescription>
        </SheetHeader>
        <UTForm 
          plan={plan} 
          onSubmit={handleSubmit} 
          onCancel={() => setOpen(false)} 
          isPending={isPending} 
          error={error} 
        />
      </SheetContent>
    </Sheet>
  );
}

function UTItemActions({ plan, unit }: { readonly plan: TeachingPlanFull; readonly unit: PlanTeachingUnit }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleEdit(data: any, raIds: string[]) {
    setIsDeleting(true);
    const res = await updatePlanUnit(plan.id, unit.id, data, raIds);
    setIsDeleting(false);
    if (res.ok) { setIsEditOpen(false); router.refresh(); }
    else setError(res.error);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la unidad "${unit.code} - ${unit.title}"?`)) return;
    setIsDeleting(true);
    const res = await deletePlanUnit(plan.id, unit.id);
    if (res.ok) router.refresh();
    else { alert(res.error); setIsDeleting(false); }
  }

  return (
    <div className="flex justify-end gap-1">
      <Sheet open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); setError(""); }}>
        <SheetTrigger className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-900 border-none transition-colors cursor-pointer">
          <Edit2 className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="right" className="bg-white dark:bg-zinc-950 w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar Unidad de Trabajo</SheetTitle>
            <SheetDescription>Modifica la {unit.code}.</SheetDescription>
          </SheetHeader>
          <UTForm 
            plan={plan} 
            initialData={unit} 
            onSubmit={handleEdit} 
            onCancel={() => setIsEditOpen(false)} 
            isPending={isDeleting} 
            error={error} 
          />
        </SheetContent>
      </Sheet>
      
      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600 border-none" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function UnitsTab({ plan }: { readonly plan: TeachingPlanFull }) {
  const [units, setUnits] = useState(plan.units || []);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setUnits(plan.units || []);
  }, [plan.units]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = units.findIndex((i: any) => i.id === active.id);
      const newIndex = units.findIndex((i: any) => i.id === over.id);
      const newUnits = arrayMove(units, oldIndex, newIndex);
      setUnits(newUnits);
      
      startTransition(async () => {
        await updatePlanUnitOrder(plan.id, newUnits.map((i: any) => i.id));
      });
    }
  }

  const totalHoursUsed = calculateTotalHours(units);
  const targetHours = plan.hours_total || 0;
  const hoursMatch = totalHoursUsed === targetHours;
  const percentage = Math.min(100, (totalHoursUsed / (targetHours || 1)) * 100);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Unidades de Trabajo (UT)
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Planificación temporal y contenidos del módulo.
            </p>
          </div>
          <AddUTButton plan={plan} />
        </div>

        {!isMounted ? (
          <div className="h-32 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
          </div>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
          >
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm relative">
              {isPending && (
                <div className="absolute inset-0 bg-white/20 dark:bg-black/20 z-10 pointer-events-none flex items-center justify-center">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      <span className="text-xs font-medium">Actualizando orden UT...</span>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Unidad de Trabajo</TableHead>
                    <TableHead className="text-center w-[100px]">Horas</TableHead>
                    <TableHead className="text-center w-[120px]">Trimestre</TableHead>
                    <TableHead>RAs Cubiertos</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-zinc-500 italic">
                        No hay unidades de trabajo definidas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                      {units.map((unit, index) => (
                        <SortableUTRow 
                          key={unit.id} 
                          unit={unit} 
                          plan={plan} 
                          index={index} 
                          sortedUnits={units} 
                        />
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </div>
          </DndContext>
        )}

        {/* Hours Progress (Footer) */}
        <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 p-4 rounded-xl mt-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-zinc-400" />
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">Total Horas Planificadas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-xl font-bold tracking-tight",
                hoursMatch ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
              )}>
                {totalHoursUsed}
              </span>
              <span className="text-zinc-300 dark:text-zinc-600 text-xl font-light">/</span>
              <PlanHoursEditor planId={plan.id} initialHours={targetHours} />
            </div>
          </div>

          <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                totalHoursUsed > targetHours ? "bg-red-500" :
                hoursMatch ? "bg-emerald-500" : "bg-blue-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {!hoursMatch && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-3 flex items-center gap-1.5 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {totalHoursUsed < targetHours 
                ? `Faltan ${targetHours - totalHoursUsed}h para completar el objetivo.` 
                : `Has superado el objetivo en ${totalHoursUsed - targetHours}h.`}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
