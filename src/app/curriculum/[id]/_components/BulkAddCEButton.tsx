"use client";

import { useState } from "react";
import { addMultipleCE } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Layers, Loader2, Info } from "lucide-react";
import { SHEET_CONTENT_FLEX_CLASS } from "@/lib/ui-constants";

interface BulkAddCEButtonProps {
  readonly templateId: string;
  readonly raId: string;
}

export function BulkAddCEButton({ templateId, raId }: BulkAddCEButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  // Parse text whenever it changes
  const parsedItems: { code: string; description: string }[] = [];
  
  if (text.trim()) {
    // Split text by picking up letters followed by a parenthesis.
    // the regex captures the letter as a group, so `split` returns it interleaved.
    const parts = text.split(/(?:^|\s+)([a-zA-Z])\)\s+/);
    
    // parts[0] is everything before the first "a)", we skip it if it's empty or irrelevant
    // parts[1] is the first code ("a")
    // parts[2] is the first description
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        parsedItems.push({
          code: parts[i].trim(),
          description: parts[i + 1].trim().replaceAll(/\s+/g, ' ') // Normalize spaces (removes weird tabs/newlines mid-text)
        });
      }
    }
  }

  async function handleSave() {
    if (parsedItems.length === 0) {
      setError("No se encontraron criterios válidos con el formato 'código) descripción'.");
      return;
    }
    
    setIsPending(true);
    setError("");
    
    const payloads = parsedItems.map(item => ({
      code: item.code,
      description: item.description,
      weight: 0 // Hidden for now
    }));

    const res = await addMultipleCE(templateId, raId, payloads);
    
    if (res.ok) {
        setOpen(false);
        setText("");
    } else {
        setError(res.error);
    }
    
    setIsPending(false);
  }

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setText(""); setError(""); } }}>
      <SheetTrigger>
        <div className="text-[11px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-bold tracking-tight uppercase transition-colors cursor-pointer ml-3">
          <Layers className="h-3 w-3" /> Añadir Varios
        </div>
      </SheetTrigger>
      <SheetContent side="right" className={SHEET_CONTENT_FLEX_CLASS}>
        <div className="px-6 pt-6 pb-2 shrink-0">
          <SheetHeader>
            <SheetTitle>Añadir Múltiples Criterios</SheetTitle>
            <SheetDescription>
              Pega el texto directamente. El sistema detectará automáticamente los criterios si siguen un patrón como <strong>a)</strong>, <strong>b)</strong>.
            </SheetDescription>
          </SheetHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkText">Texto origen</Label>
              <textarea 
                id="bulkText" 
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ejemplo:&#10;a) Se han caracterizado y diferenciado...&#10;b) Se han identificado las capacidades..."
                className="flex w-full rounded-md border border-input bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
              />
            </div>

            {parsedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <span>Previsualización ({parsedItems.length})</span>
                </div>
                <div className="space-y-2">
                    {parsedItems.map((item, i) => (
                        <div key={item.code + i} className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-sm flex gap-3">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{item.code}</span>
                            <span className="text-zinc-700 dark:text-zinc-300 flex-1 leading-relaxed text-xs">{item.description}</span>
                        </div>
                    ))}
                </div>
              </div>
            )}

            {text.length > 0 && parsedItems.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 p-3 rounded-lg flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-400">No hemos detectado ningún formato válido. Asegúrate de separar los códigos con un paréntesis o punto, como &quot;a)texto&quot; o &quot;1. texto&quot;.</p>
                </div>
            )}
          </div>
        </div>
          
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
          {error && <p className="text-xs text-destructive font-semibold mb-3">{error}</p>}
          <Button 
            type="button"
            className="w-full" 
            disabled={isPending || parsedItems.length === 0} 
            onClick={() => handleSave()}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Guardar ${parsedItems.length} Criterios`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
