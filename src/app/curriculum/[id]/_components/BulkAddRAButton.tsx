"use client";

import { useState } from "react";
import { addMultipleRAWithCE } from "@/domain/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Layers, Loader2, Info } from "lucide-react";
import { SHEET_CONTENT_FLEX_CLASS } from "@/lib/ui-constants";

interface BulkAddRAButtonProps {
  readonly templateId: string;
}

type ParsedCE = { code: string; description: string };
type ParsedRA = { code: string; description: string; ces: ParsedCE[] };

export function BulkAddRAButton({ templateId }: BulkAddRAButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const parsedItems: ParsedRA[] = [];
  
  if (text.trim()) {
    // 1. Split text by RA patterns: number + . or ) + space
    const raRegex = /(?:^|\s|\n)(\d+)[).-]\s+/;
    const raParts = text.split(raRegex);
    
    // raParts[1] is the first RA code, raParts[2] is its content
    for (let i = 1; i < raParts.length; i += 2) {
      const raCode = raParts[i]?.trim();
      const raContent = raParts[i + 1] || "";
      
      if (!raCode) continue;

      // 2. Inside RA content, split by CE pattern: letter + ) + space
      const ceRegex = /(?:^|\s|\n)([a-zA-Z])[).-]\s+/;
      const ceParts = raContent.split(ceRegex);
      
      // ceParts[0] is the RA description.
      let raDescription = ceParts[0].trim();
      // Remove trailing "Criterios de evaluación:" typical headers if they exist
      raDescription = raDescription.replace(/Criterios de evaluaci[oó]n:?\s*$/i, '').trim();
      raDescription = raDescription.replaceAll(/\s+/g, ' ');

      const ces: ParsedCE[] = [];
      // ceParts[1] is the first CE code, ceParts[2] is its description
      for (let j = 1; j < ceParts.length; j += 2) {
         const ceCode = ceParts[j]?.trim();
         const ceDesc = (ceParts[j + 1] || "").trim().replaceAll(/\s+/g, ' ');
         if (ceCode && ceDesc) {
           ces.push({ code: ceCode, description: ceDesc });
         }
      }

      parsedItems.push({
        code: raCode,
        description: raDescription,
        ces
      });
    }
  }

  async function handleSave() {
    if (parsedItems.length === 0) {
      setError("No se detectaron Resultados de Aprendizaje válidos con el formato '1.', '2.', etc.");
      return;
    }
    
    setIsPending(true);
    setError("");

    const res = await addMultipleRAWithCE(templateId, parsedItems);
    
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
        <div className="flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer mr-2 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-md shadow-sm">
          <Layers className="h-4 w-4 mr-1.5" /> Añadir Módulo Completo
        </div>
      </SheetTrigger>
      <SheetContent side="right" className={SHEET_CONTENT_FLEX_CLASS}>
        <div className="px-6 pt-6 pb-2 shrink-0 border-b border-zinc-100 dark:border-zinc-800">
          <SheetHeader>
            <SheetTitle>Añadir RAs y Criterios (Módulo Completo)</SheetTitle>
            <SheetDescription>
              Pega todo el texto oficial (incluyendo <strong>1.</strong>, <strong>2.</strong> para los RAs y <strong>a)</strong>, <strong>b)</strong> para los criterios).
            </SheetDescription>
          </SheetHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkTextRA">Texto oficial del bloque completo</Label>
              <textarea 
                id="bulkTextRA" 
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ejemplo:&#10;1. Selecciona las arquitecturas...&#10;Criterios de evaluación:&#10;a) Se han caracterizado...&#10;b) Se han identificado..."
                className="flex w-full rounded-md border border-input bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
              />
            </div>

            {parsedItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider border-b pb-1 dark:border-zinc-800">
                  <span>De este texto se crearán:</span>
                </div>
                <div className="space-y-4">
                    {parsedItems.map((ra, i) => (
                        <div key={ra.code + i} className="border border-emerald-100 dark:border-emerald-900 rounded-lg overflow-hidden">
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 font-medium text-sm flex gap-3 text-emerald-900 dark:text-emerald-100">
                                <span className="font-bold shrink-0">{ra.code}.</span>
                                <span>{ra.description}</span>
                            </div>
                            {ra.ces.length > 0 && (
                                <div className="p-3 bg-white dark:bg-zinc-950 space-y-2">
                                   <div className="text-[10px] font-bold uppercase text-zinc-400">Criterios de este RA ({ra.ces.length}):</div>
                                   {ra.ces.map((ce, j) => (
                                     <div key={ce.code + j} className="text-xs flex gap-2 text-zinc-600 dark:text-zinc-400">
                                        <span className="font-bold">{ce.code})</span>
                                        <span>{ce.description}</span>
                                     </div>
                                   ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
              </div>
            )}

            {text.length > 0 && parsedItems.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 p-3 rounded-lg flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-400">No hemos detectado ningún Resultado de Aprendizaje. Verifica que empiezan por un número, como &quot;1. &quot; o &quot;2. &quot;.</p>
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
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Guardar ${parsedItems.length} RAs (y sus Criterios)`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
