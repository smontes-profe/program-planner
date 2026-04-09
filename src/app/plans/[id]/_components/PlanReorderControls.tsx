"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { movePlanRA, movePlanCE, movePlanUnit } from "@/domain/teaching-plan/actions";

export function ReorderPlanRA({ planId, raId, isFirst, isLast }: { planId: string; raId: string; isFirst: boolean; isLast: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-0.5">
      <button onClick={() => startTransition(() => { movePlanRA(planId, raId, "up"); })} disabled={isFirst || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowUp className="h-3 w-3" /></button>
      <button onClick={() => startTransition(() => { movePlanRA(planId, raId, "down"); })} disabled={isLast || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowDown className="h-3 w-3" /></button>
    </div>
  );
}

export function ReorderPlanCE({ planId, raId, ceId, isFirst, isLast }: { planId: string; raId: string; ceId: string; isFirst: boolean; isLast: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-0.5">
      <button onClick={() => startTransition(() => { movePlanCE(planId, raId, ceId, "up"); })} disabled={isFirst || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowUp className="h-3 w-3" /></button>
      <button onClick={() => startTransition(() => { movePlanCE(planId, raId, ceId, "down"); })} disabled={isLast || isPending} className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowDown className="h-3 w-3" /></button>
    </div>
  );
}

export function ReorderPlanUnit({ planId, unitId, isFirst, isLast }: { planId: string; unitId: string; isFirst: boolean; isLast: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-0.5">
      <button onClick={() => startTransition(() => { movePlanUnit(planId, unitId, "up"); })} disabled={isFirst || isPending} className="h-5 w-5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowUp className="h-3 w-3" /></button>
      <button onClick={() => startTransition(() => { movePlanUnit(planId, unitId, "down"); })} disabled={isLast || isPending} className="h-5 w-5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowDown className="h-3 w-3" /></button>
    </div>
  );
}
