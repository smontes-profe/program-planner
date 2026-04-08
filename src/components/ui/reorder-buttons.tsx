"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export function ReorderButtons({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  className = ""
}: {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => Promise<any> | void;
  onMoveDown: () => Promise<any> | void;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <button
        onClick={() => startTransition(onMoveUp)}
        disabled={isFirst || isPending}
        className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex flex-col justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Mover arriba"
      >
        <ArrowUp className="h-3 w-3" />
      </button>
      <button
        onClick={() => startTransition(onMoveDown)}
        disabled={isLast || isPending}
        className="h-4 w-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded flex flex-col justify-center items-center text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Mover abajo"
      >
        <ArrowDown className="h-3 w-3" />
      </button>
    </div>
  );
}
