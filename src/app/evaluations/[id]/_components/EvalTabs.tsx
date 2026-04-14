"use client";

import { useState } from "react";
import { type EvaluationContextFull, type GradeComputationResult } from "@/domain/evaluation/types";
import { cn } from "@/lib/utils";
import { Users, Grid3x3, BarChart3, Download } from "lucide-react";
import { StudentsTab } from "./StudentsTab";
import { GradeMatrixTab } from "./GradeMatrixTab";
import { GradesTab } from "./GradesTab";
import { ExportTab } from "./ExportTab";

interface EvalTabsProps {
  readonly context: EvaluationContextFull;
  readonly gradesResult: GradeComputationResult | null;
}

type TabId = "students" | "matrix" | "grades" | "export";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "students", label: "Alumnado", icon: <Users className="h-4 w-4" /> },
  { id: "matrix", label: "Matriz de notas", icon: <Grid3x3 className="h-4 w-4" /> },
  { id: "grades", label: "Notas calculadas", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "export", label: "Exportación", icon: <Download className="h-4 w-4" /> },
];

export function EvalTabs({ context, gradesResult }: EvalTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("students");

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex gap-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {activeTab === "students" && <StudentsTab context={context} />}
        {activeTab === "matrix" && <GradeMatrixTab context={context} />}
        {activeTab === "grades" && <GradesTab gradesResult={gradesResult} />}
        {activeTab === "export" && <ExportTab context={context} gradesResult={gradesResult} />}
      </div>
    </div>
  );
}
