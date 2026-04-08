import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "neutral" | "warning" | "destructive" | "default" | "secondary" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground border-transparent dark:bg-primary dark:text-primary-foreground",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    neutral: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    secondary: "bg-secondary text-secondary-foreground border-transparent dark:bg-secondary dark:text-secondary-foreground",
    outline: "text-foreground dark:text-foreground",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    destructive: "bg-destructive text-destructive-foreground border-transparent dark:bg-destructive dark:text-destructive-foreground",
  };
  
  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )} 
      {...props} 
    />
  );
}

export { Badge };
