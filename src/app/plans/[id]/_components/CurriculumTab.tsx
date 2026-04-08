"use client";

import { useState, useTransition, useEffect } from "react";
import { type TeachingPlanFull, type PlanRA } from "@/domain/teaching-plan/types";
import {
  addPlanRA, updatePlanRA, deletePlanRA,
  addPlanCE, updatePlanCE, deletePlanCE,
  updatePlanRAOrder, updatePlanCEOrder
} from "@/domain/teaching-plan/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Plus, Edit2, Trash2, Loader2, BookOpen, 
  GripVertical, ChevronDown, ChevronRight 
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── shared form textarea className ──────────────────────
const textareaClass = "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800";

// ─── Plan RA Sortable Item ──────────────────────────────────
function SortablePlanRA({ ra, planId, isAnyDragging }: { 
  ra: PlanRA; 
  planId: string;
  isAnyDragging: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ra.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  // Auto-collapse when any RA is dragging
  const effectiveCollapsed = isDragging || (isAnyDragging && !isDragging) || isCollapsed;

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <Card className={cn(
        "border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors",
        isDragging && "border-primary ring-2 ring-primary/20",
      )}>
        <div className="bg-zinc-50 px-4 py-2.5 flex justify-between items-center border-b border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
              <GripVertical className="h-4 w-4 text-zinc-400" />
            </div>
            <span className="text-sm font-bold font-mono text-zinc-400 shrink-0">RA {ra.code}</span>
            <p className="text-zinc-800 dark:text-zinc-200 text-sm truncate font-medium flex-1">
              {ra.description}
            </p>
          </div>
          
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <Button 
               variant="ghost" 
               size="icon" 
               className="h-8 w-8 text-zinc-400 hover:text-zinc-900" 
               onClick={() => setIsCollapsed(!isCollapsed)}
            >
               {effectiveCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <EditRAButton planId={planId} ra={ra} />
            <DeleteRAButton planId={planId} raId={ra.id} />
          </div>
        </div>

        {!effectiveCollapsed && (
          <CardContent className="pt-4 pb-6 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Criterios de Evaluación</h4>
                    <AddCEButton planId={planId} raId={ra.id} />
                </div>
                
                {ra.ces && ra.ces.length > 0 ? (
                   <SortablePlanCEList planId={planId} raId={ra.id} ces={ra.ces} />
                ) : (
                  <p className="text-xs text-zinc-400 italic">No hay criterios definidos.</p>
                )}
             </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ─── Plan CE Sortable Item ──────────────────────────────────
function SortablePlanCE({ ce, planId }: { ce: any; planId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ce.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(
      "group p-3 bg-white border border-zinc-100 rounded-lg flex gap-4 dark:bg-zinc-950 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all",
      isDragging && "border-primary/50 shadow-lg ring-1 ring-primary/10"
    )}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors self-start">
        <GripVertical className="h-4 w-4 text-zinc-300" />
      </div>
      <div className="font-mono text-zinc-400 text-xs font-bold pt-0.5">{ce.code}</div>
      <div className="flex-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
          {ce.description}
        </p>
      </div>
      <div className="flex items-start gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
        <EditCEButton planId={planId} ce={ce} />
        <DeleteCEButton planId={planId} ceId={ce.id} />
      </div>
    </div>
  );
}

// ─── Plan CE List Container ─────────────────────────────────
function SortablePlanCEList({ planId, raId, ces }: { planId: string; raId: string; ces: any[] }) {
  const [items, setItems] = useState(ces);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i: any) => i.id === active.id);
      const newIndex = items.findIndex((i: any) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      
      startTransition(async () => {
        await updatePlanCEOrder(planId, newItems.map((i: any) => i.id));
      });
    }
  }

  return (
    <div className="relative">
      {isPending && <div className="absolute inset-0 bg-white/20 dark:bg-black/20 z-10 pointer-events-none flex items-center justify-center rounded-lg" />}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {items.map((ce: any) => (
              <SortablePlanCE key={ce.id} ce={ce} planId={planId} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ─── RA CRUD Components (Existing logic reused) ────────────

function AddRAButton({ planId }: { readonly planId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const form = e.currentTarget;
    const res = await addPlanRA(planId, {
      code: (form.elements.namedItem("code") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
    });
    setIsPending(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError(res.error);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); setError(""); }}>
      <SheetTrigger>
        <div className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-background h-8 gap-1.5 px-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
          <Plus className="h-4 w-4" /> Añadir RA
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950">
        <SheetHeader>
          <SheetTitle>Añadir RA</SheetTitle>
          <SheetDescription>Añade un Resultado de Aprendizaje a esta programación.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="ra-code">Código</Label>
            <Input id="ra-code" name="code" placeholder="RA1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ra-description">Descripción</Label>
            <textarea id="ra-description" name="description" rows={4} required className={textareaClass} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar RA"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function EditRAButton({ planId, ra }: { readonly planId: string; readonly ra: PlanRA }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const form = e.currentTarget;
    const res = await updatePlanRA(planId, ra.id, {
      code: (form.elements.namedItem("code") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
    });
    setIsPending(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError(res.error);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <div className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer">
          <Edit2 className="h-4 w-4" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950">
        <SheetHeader>
          <SheetTitle>Editar RA</SheetTitle>
          <SheetDescription>Modifica los datos del Resultado de Aprendizaje.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="edit-ra-code">Código</Label>
            <Input id="edit-ra-code" name="code" defaultValue={ra.code} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ra-description">Descripción</Label>
            <textarea id="edit-ra-description" name="description" rows={4} defaultValue={ra.description} required className={textareaClass} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteRAButton({ planId, raId }: { readonly planId: string; readonly raId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  async function handleDelete() {
    if (!confirm("¿Eliminar este RA y todos sus criterios asociados?")) return;
    setIsPending(true);
    const res = await deletePlanRA(planId, raId);
    if (res.ok) router.refresh();
    else { alert(res.error); setIsPending(false); }
  }
  return (
    <button onClick={handleDelete} disabled={isPending} className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-600 transition-colors">
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

// ─── CE CRUD Components ────────────────────────────────────

function AddCEButton({ planId, raId }: { readonly planId: string; readonly raId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const form = e.currentTarget;
    const res = await addPlanCE(planId, raId, {
      code: (form.elements.namedItem("code") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
    });
    setIsPending(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError(res.error);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); setError(""); }}>
      <SheetTrigger>
        <span className="text-[11px] text-zinc-500 hover:text-primary flex items-center gap-1 font-bold tracking-tight uppercase transition-colors cursor-pointer">
          <Plus className="h-3 w-3" /> Añadir Criterio
        </span>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950">
        <SheetHeader>
          <SheetTitle>Añadir Criterio</SheetTitle>
          <SheetDescription>Añade un Criterio de Evaluación a este RA.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="ce-code">Código</Label>
            <Input id="ce-code" name="code" placeholder="a" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce-description">Descripción</Label>
            <textarea id="ce-description" name="description" rows={4} required className={textareaClass} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Criterio"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function EditCEButton({ planId, ce }: { readonly planId: string; readonly ce: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const form = e.currentTarget;
    const res = await updatePlanCE(planId, ce.id, {
      code: (form.elements.namedItem("code") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
    });
    setIsPending(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError(res.error);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <div className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-600/10 transition-colors cursor-pointer">
          <Edit2 className="h-3 w-3" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="bg-white dark:bg-zinc-950">
        <SheetHeader>
          <SheetTitle>Editar Criterio</SheetTitle>
          <SheetDescription>Modifica este Criterio de Evaluación.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="edit-ce-code">Código</Label>
            <Input id="edit-ce-code" name="code" defaultValue={ce.code} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ce-description">Descripción</Label>
            <textarea id="edit-ce-description" name="description" rows={4} defaultValue={ce.description} required className={textareaClass} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteCEButton({ planId, ceId }: { readonly planId: string; readonly ceId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  async function handleDelete() {
    if (!confirm("¿Eliminar este criterio?")) return;
    setIsPending(true);
    const res = await deletePlanCE(planId, ceId);
    if (res.ok) router.refresh();
    else { alert(res.error); setIsPending(false); }
  }
  return (
    <button onClick={handleDelete} disabled={isPending} className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-600/10 transition-colors">
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </button>
  );
}

// ─── Main Tab Component ─────────────────────────────────────

export function CurriculumTab({ plan }: { readonly plan: TeachingPlanFull }) {
  const [ras, setRas] = useState(plan.ras || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRas(plan.ras || []);
  }, [plan.ras]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = ras.findIndex((i: any) => i.id === active.id);
      const newIndex = ras.findIndex((i: any) => i.id === over.id);
      const newRas = arrayMove(ras, oldIndex, newIndex);
      setRas(newRas);
      
      startTransition(async () => {
        await updatePlanRAOrder(plan.id, newRas.map((i: any) => i.id));
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Resultados de Aprendizaje
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Clon editable del currículo base. Los cambios solo afectan a esta programación.
          </p>
        </div>
        <AddRAButton planId={plan.id} />
      </div>

      {isPending && (
        <div className="fixed top-20 right-8 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
           <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
           <span className="text-sm font-medium">Sincronizando orden...</span>
        </div>
      )}

      {ras.length > 0 ? (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ras.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {ras.map((ra) => (
                <SortablePlanRA 
                  key={ra.id} 
                  ra={ra} 
                  planId={plan.id} 
                  isAnyDragging={!!activeId} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="bg-zinc-50/50 border-dashed border-2 dark:bg-zinc-900/20 py-12 flex flex-col items-center justify-center border-zinc-200 dark:border-zinc-800">
          <BookOpen className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-zinc-500 mb-4 font-medium text-sm">No hay RAs en esta programación.</p>
          <AddRAButton planId={plan.id} />
        </Card>
      )}
    </div>
  );
}
