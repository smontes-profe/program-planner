"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { moveTemplateRA, moveTemplateCE } from "@/domain/curriculum/actions";

export function ReorderTemplateRA({ templateId, raId, isFirst, isLast }: { templateId: string; raId: string; isFirst: boolean; isLast: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-0.5">
      <button onClick={() => startTransition(() => moveTemplateRA(templateId, raId, "up"))} disabled={isFirst || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowUp className="h-3 w-3" /></button>
      <button onClick={() => startTransition(() => moveTemplateRA(templateId, raId, "down"))} disabled={isLast || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowDown className="h-3 w-3" /></button>
    </div>
  );
}

export function ReorderTemplateCE({ templateId, raId, ceId, isFirst, isLast }: { templateId: string; raId: string; ceId: string; isFirst: boolean; isLast: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-0.5">
      <button onClick={() => startTransition(() => moveTemplateCE(templateId, raId, ceId, "up"))} disabled={isFirst || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowUp className="h-3 w-3" /></button>
      <button onClick={() => startTransition(() => moveTemplateCE(templateId, raId, ceId, "down"))} disabled={isLast || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowDown className="h-3 w-3" /></button>
    </div>
  );
}
