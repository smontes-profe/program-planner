"use client";

import { useState } from "react";
import { updateTemplateDraft } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X, Loader2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface TemplateHoursEditorProps {
  readonly templateId: string;
  readonly initialHours: number;
  readonly readOnly?: boolean;
}

export function TemplateHoursEditor({ templateId, initialHours, readOnly = false }: TemplateHoursEditorProps) {
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
    const res = await updateTemplateDraft(templateId, { hours_total: hours });
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
          className="w-20 h-7 text-right font-mono font-bold text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:bg-zinc-100" onClick={() => setIsEditing(false)} disabled={isPending}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    readOnly ? (
      <span className="flex items-center gap-1.5 px-2 py-0.5">
        <Clock className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-zinc-600 dark:text-zinc-400 font-bold text-sm">
          {initialHours}h
        </span>
      </span>
    ) : (
      <button 
        type="button"
        className="flex items-center gap-1.5 group cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-0.5 rounded transition-colors" 
        onClick={() => setIsEditing(true)}
      >
        <Clock className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-zinc-600 dark:text-zinc-400 font-bold text-sm">
          {initialHours}h
        </span>
        <Edit2 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
      </button>
    )
  );
}
