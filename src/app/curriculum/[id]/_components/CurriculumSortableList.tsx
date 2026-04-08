"use client";

import { useState, useTransition, useEffect } from "react";
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
import { GripVertical, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateTemplateRAOrder, updateTemplateCEOrder } from "@/domain/curriculum/actions";
import { EditRAButton } from "./EditRAButton";
import { DeleteRAButton } from "./DeleteRAButton";
import { AddCEButton } from "./AddCEButton";
import { BulkAddCEButton } from "./BulkAddCEButton";
import { EditCEButton } from "./EditCEButton";
import { DeleteCEButton } from "./DeleteCEButton";

// ─── Sortable RA Item ───────────────────────────────────────
function SortableRA({ ra, templateId, isDraft, isAnyDragging }: any) {
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
            <EditRAButton templateId={templateId} ra={ra} />
            <DeleteRAButton templateId={templateId} raId={ra.id} />
          </div>
        </div>

        {!effectiveCollapsed && (
          <CardContent className="pt-4 pb-6 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Criterios de Evaluación</h4>
                    <div className="flex items-center gap-1">
                      <AddCEButton templateId={templateId} raId={ra.id} />
                      <BulkAddCEButton templateId={templateId} raId={ra.id} />
                    </div>
                </div>
                
                {ra.ces && ra.ces.length > 0 ? (
                   <SortableCEList templateId={templateId} raId={ra.id} ces={ra.ces} isDraft={isDraft} />
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

// ─── Sortable CE Item ───────────────────────────────────────
function SortableCE({ ce, templateId, raId, isDraft }: any) {
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
        <EditCEButton templateId={templateId} ce={ce} />
        <DeleteCEButton templateId={templateId} ceId={ce.id} />
      </div>
    </div>
  );
}

// ─── CE List Container ──────────────────────────────────────
function SortableCEList({ templateId, raId, ces, isDraft }: any) {
  const [items, setItems] = useState(ces);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(ces);
  }, [ces]);

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
        await updateTemplateCEOrder(templateId, newItems.map((i: any) => i.id));
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
              <SortableCE key={ce.id} ce={ce} templateId={templateId} raId={raId} isDraft={isDraft} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ─── Main Content Wrapper ───────────────────────────────────
export function CurriculumSortableList({ template, isDraft }: any) {
  const [ras, setRas] = useState(template.ras || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRas(template.ras || []);
  }, [template.ras]);

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
        await updateTemplateRAOrder(template.id, newRas.map((i: any) => i.id));
      });
    }
  }

  return (
    <div className="relative">
      {isPending && (
        <div className="fixed top-20 right-8 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
           <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
           <span className="text-sm font-medium">Actualizando orden...</span>
        </div>
      )}
      
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ras.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {ras.map((ra: any) => (
              <SortableRA 
                key={ra.id} 
                ra={ra} 
                templateId={template.id} 
                isDraft={isDraft} 
                isAnyDragging={!!activeId} 
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
