"use client";

import { useState } from "react";
import { updatePlan } from "@/domain/teaching-plan/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PlanHoursEditorProps {
  readonly planId: string;
  readonly initialHours: number;
}

export function PlanHoursEditor({ planId, initialHours }: PlanHoursEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [hours, setHours] = useState(initialHours);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    if (hours === initialHours) {
      setIsEditing(false);
      return;
    }
    
    setIsPending(true);
    const res = await updatePlan(planId, { hours_total: hours });
    setIsPending(false);
    
    if (res.ok) {
      setIsEditing(false);
      router.refresh();
    } else {
      alert("Error al actualizar las horas: " + res.error);
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1 duration-200">
        <Input 
          type="number" 
          value={hours} 
          onChange={(e) => setHours(Number(e.target.value))} 
          className="w-20 h-8 text-right font-mono font-bold"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:bg-zinc-100" onClick={() => setIsEditing(false)} disabled={isPending}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button 
      type="button"
      className="flex items-center gap-2 group cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded transition-colors" 
      onClick={() => setIsEditing(true)}
    >
      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-none">
        {initialHours}
      </span>
      <Edit2 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
    </button>
  );
}
